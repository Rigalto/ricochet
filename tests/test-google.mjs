// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-google.mjs — node tests/run.mjs Google
// The connection to a Google account (adapters/google.mjs), with a fake library of Google, a fake storage and a fake
// fetch: sign in, the account kept, the renewal at a click, the expiry, the other tabs, the requests, signing out.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {GoogleAccount, GoogleError, GOOGLE_DRIVE_FILE, GOOGLE_TASKS} from '../src/adapters/google.mjs'
import {SecretStore} from '../src/core/secrets.mjs'
import {bus} from '../src/core/bus.mjs'
import {$global} from '../src/core/global.mjs'
import '../src/core/debug.mjs'

class FakeStorage {
  #map = new Map()
  get length () { return this.#map.size }
  key (i) { return [...this.#map.keys()][i] ?? null }
  getItem (key) { return this.#map.get(key) ?? null }
  setItem (key, value) { this.#map.set(key, String(value)) }
  removeItem (key) { this.#map.delete(key) }
}

// the library of Google: records the requests of a token; the test answers with give()
const fakeOauth = () => {
  const oauth = {requests: [], revoked: [], config: null}
  oauth.initTokenClient = config => {
    oauth.config = config
    return {requestAccessToken: options => oauth.requests.push(options)}
  }
  oauth.revoke = (token, done) => { oauth.revoked.push(token); done() }
  oauth.give = (token, scope = 'email https://www.googleapis.com/auth/drive.file', expiresIn = 3599) =>
    oauth.config.callback({access_token: token, expires_in: expiresIn, scope, token_type: 'Bearer'})
  oauth.close = () => oauth.config.error_callback({type: 'popup_closed'})
  return oauth
}

// fetch: answers from a table of handlers, records the calls
const calls = []
let answers = []
globalThis.fetch = async (url, init = {}) => {
  calls.push({url, init})
  const handler = answers.find(a => url.startsWith(a.url))
  const {status = 200, body = ''} = handler ? handler.answer(url, init) : {status: 404, body: '{"error": {"message": "Not found"}}'}
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {status, ok: status >= 200 && status < 300, statusText: String(status), text: async () => text, json: async () => JSON.parse(text), blob: async () => text}
}
const USERINFO = {url: 'https://www.googleapis.com/oauth2/v3/userinfo', answer: () => ({body: {email: 'didier@example.com'}})}

const seen = []
for (const name of ['googleConnected', 'googleExpired', 'googleDisconnected']) { bus.on(name, payload => seen.push([name, payload])) }
const events = () => seen.splice(0).map(([name, payload]) => `${name} ${JSON.stringify(payload)}`)
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

let now = 1_000_000
const storage = new FakeStorage()
const secretStore = new SecretStore({storage})
const oauth = fakeOauth()
const account = new GoogleAccount({secretStore, oauth, now: () => now})

await describe('Google — sign in', async () => {
  answers = [USERINFO]
  assert('before configure: signed out', account.state === 'signed-out' && account.email === '')
  const state = await account.configure({clientId: 'id.apps.googleusercontent.com', scopes: [GOOGLE_DRIVE_FILE]})
  assert('configure: the client of Google, the scopes with email', state === 'signed-out' &&
    oauth.config.client_id === 'id.apps.googleusercontent.com' && oauth.config.scope === `email ${GOOGLE_DRIVE_FILE}`)
  account.signIn()
  assert('sign in: the consent is asked', oauth.requests.length === 1 && oauth.requests[0].prompt === 'consent' &&
    oauth.requests[0].include_granted_scopes === true)
  account.signIn()
  assert('a second click meanwhile: one window only', oauth.requests.length === 1)
  oauth.give('tok-1')
  await tick()
  assert('the token: the address read, then googleConnected', account.state === 'connected' && account.email === 'didier@example.com' &&
    JSON.stringify(events()) === JSON.stringify(['googleConnected {"email":"didier@example.com"}']))
  const kept = JSON.parse(storage.getItem('ricochet-secret-google-account'))
  assert('kept as a secret: token, expiry, scopes, address', kept.token === 'tok-1' && kept.expiresAt === now + 3599000 &&
    kept.scopes.includes(GOOGLE_DRIVE_FILE) && kept.email === 'didier@example.com')
  assert('never in the logs', !JSON.stringify($global.logs).includes('tok-1'))
  assert('hasScopes', account.hasScopes([GOOGLE_DRIVE_FILE]) && !account.hasScopes([GOOGLE_TASKS]))
})

await describe('Google — requests', async () => {
  answers = [
    {url: 'https://www.googleapis.com/drive/v3/files', answer: (url, init) => ({body: {files: [], auth: init.headers.Authorization, url}})},
    {url: 'https://www.googleapis.com/upload', answer: () => ({status: 204})},
    {url: 'https://www.googleapis.com/fail', answer: () => ({status: 403, body: {error: {message: 'Forbidden here'}}})}
  ]
  const result = await account.request('https://www.googleapis.com/drive/v3/files', {query: {q: "name = 'a'", pageSize: 10}, source: 'drive'})
  assert('the token in the header, the query in the address', result.auth === 'Bearer tok-1' &&
    result.url === 'https://www.googleapis.com/drive/v3/files?q=name+%3D+%27a%27&pageSize=10')
  const entry = $global.logs.ajax[0]
  assert('logged with its source, without the token', entry.source === 'drive' && entry.status === 200 && !JSON.stringify(entry).includes('tok-1'))
  calls.length = 0
  const empty = await account.request('https://www.googleapis.com/upload', {method: 'PATCH', body: {title: 'x'}})
  assert('an object sent as JSON; an empty answer: null', empty === null && calls[0].init.body === '{"title":"x"}' &&
    calls[0].init.headers['Content-Type'] === 'application/json' && $global.logs.ajax[0].body === '{"title":"x"}')
  let error = null
  try { await account.request('https://www.googleapis.com/fail') } catch (e) { error = e }
  assert('an error: GoogleError with the status and the message of Google', error instanceof GoogleError && error.status === 403 &&
    error.message === 'Forbidden here')
})

await describe('Google — renewal and expiry', async () => {
  answers = [USERINFO]
  account.userGesture()
  assert('a click long before the expiry: nothing', oauth.requests.length === 1)
  now += 3599000 - 200000 // 200 s left, within the margin of 300 s
  account.userGesture()
  assert('a click in the last minutes: a new token, without consent, with the address as hint', oauth.requests.length === 2 &&
    oauth.requests[1].prompt === '' && oauth.requests[1].login_hint === 'didier@example.com')
  oauth.give('tok-2')
  await tick()
  assert('renewed: still connected, no event', account.state === 'connected' && events().length === 0 &&
    JSON.parse(storage.getItem('ricochet-secret-google-account')).token === 'tok-2')
  now += 3600000
  assert('expired: check() says it, googleExpired', account.check() === 'expired' &&
    JSON.stringify(events()) === JSON.stringify(['googleExpired {"email":"didier@example.com"}']))
  account.userGesture()
  assert('a click once expired: no window (the application shows « Reconnect »)', oauth.requests.length === 2)
  // a request waits for the reconnection
  answers = [{url: 'https://www.googleapis.com/drive/v3/files', answer: (url, init) => ({body: {auth: init.headers.Authorization}})}]
  let done = null
  const waiting = account.request('https://www.googleapis.com/drive/v3/files').then(r => { done = r })
  await tick()
  assert('a request waits', done === null)
  account.signIn() // the click on « Reconnect »
  assert('reconnect: without consent', oauth.requests.length === 3 && oauth.requests[2].prompt === '')
  oauth.give('tok-3')
  await waiting
  assert('then it is sent with the new token', done.auth === 'Bearer tok-3' &&
    JSON.stringify(events()) === JSON.stringify(['googleConnected {"email":"didier@example.com"}']))
  // a 401: the token is marked expired, the request waits, then is sent again once
  let refused = true
  answers = [{url: 'https://www.googleapis.com/drive/v3/files', answer: (url, init) => refused ? ({status: 401}) : ({body: {auth: init.headers.Authorization}})}]
  done = null
  const again = account.request('https://www.googleapis.com/drive/v3/files').then(r => { done = r })
  await tick(); await tick()
  assert('401: expired, the request waits', account.state === 'expired' && done === null && events().includes('googleExpired {"email":"didier@example.com"}'))
  refused = false
  account.signIn()
  oauth.give('tok-4')
  await again
  assert('then sent again with the new token', done.auth === 'Bearer tok-4')
  events()
  // the window closed by the user: nothing changes, a later click can try again
  now += 3599000 - 100000
  captureConsole()
  account.userGesture()
  oauth.close()
  releaseConsole()
  account.userGesture()
  assert('window closed: another click tries again', oauth.requests.length === 6 && account.state === 'connected')
  oauth.give('tok-5')
  await tick()
})

let other = null
await describe('Google — another tab, more scopes', async () => {
  other = new GoogleAccount({secretStore, oauth: fakeOauth(), now: () => now})
  await other.configure({clientId: 'id', scopes: [GOOGLE_DRIVE_FILE]})
  assert('another tab: the account kept is taken back', other.state === 'connected' && other.email === 'didier@example.com')
  events()
  account.signIn({scopes: [GOOGLE_TASKS]})
  const asked = oauth.requests.at(-1)
  assert('more scopes: consent, the new scope asked with the others', asked.prompt === 'consent' && asked.scope.includes(GOOGLE_TASKS) &&
    asked.scope.includes(GOOGLE_DRIVE_FILE))
  oauth.give('tok-6', `email ${GOOGLE_DRIVE_FILE} ${GOOGLE_TASKS}`)
  await tick()
  assert('granted', account.hasScopes([GOOGLE_TASKS]))
})

await describe('Google — signing out', async () => {
  events()
  account.signOut({revoke: true})
  // both instances share the bus here: the other tab says it too (not revoked: it only saw the secret removed)
  assert('signed out: googleDisconnected, revoked; the other tab signed out too', account.state === 'signed-out' &&
    account.email === '' && other.state === 'signed-out' &&
    JSON.stringify(events().sort()) === JSON.stringify(['googleDisconnected {"revoked":false}', 'googleDisconnected {"revoked":true}']))
  assert('the access withdrawn at Google, the secret removed', oauth.revoked.at(-1) === 'tok-6' &&
    storage.getItem('ricochet-secret-google-account') === null)
  let error = null
  try { await account.request('https://www.googleapis.com/drive/v3/files') } catch (e) { error = e }
  assert('signed out: a request fails at once', error instanceof GoogleError && error.status === 'signed-out')
  account.signIn()
  assert('signing in again asks for the consent', oauth.requests.at(-1).prompt === 'consent')
})
