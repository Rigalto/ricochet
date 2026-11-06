// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The connection to a Google account, and the calls to the APIs of Google (Drive, Sheets, Tasks…) with its token: an
 * application without any server reaches the data of its user in the user's own Google account.
 *
 * ```javascript
 * import {googleAccount} from 'ricochet/adapters/google.mjs'
 *
 * await googleAccount.configure({clientId: '….apps.googleusercontent.com', scopes: [DRIVE_FILE]})
 * // in the click handler of a « Sign in with Google » button (the browser opens the window of Google only after a click)
 * googleAccount.signIn()
 * // anywhere, once connected
 * const files = await googleAccount.request('https://www.googleapis.com/drive/v3/files', {query: {q: "trashed = false"}, source: 'drive'})
 * ```
 *
 * The module is not exported by `ricochet.mjs`: an application that does not use Google does not load it, and the
 * library of Google (Google Identity Services, from `accounts.google.com`, the only script that Ricochet loads from
 * another site) is loaded by `configure()` only.
 *
 * ## The client identifier
 *
 * The application is declared once in the console of Google Cloud: a project, the APIs it calls, its consent screen,
 * and a client identifier of type « Web application » whose authorized JavaScript origins are the sites of the
 * application (`https://user.github.io`, `http://localhost`). The client identifier is public — it is sent to every
 * browser — and can be written in the code; there is no client secret in a browser.
 *
 * ## The token
 *
 * The user signs in once and accepts the access asked by the application (the scopes). Google then gives an access
 * token, valid about one hour, and no refresh token: a page without a server cannot get one.
 *
 * - **Kept in this browser.** The token, its time of expiry, the scopes granted and the address of the account are kept
 *   as a secret (`secrets`, name `google-account`): a reload, or another tab of the site, stays connected until the
 *   expiry. The token is never in a configuration item, in the payload of an event, nor in a log (the requests are
 *   logged by `logRequest()`, which takes no header).
 * - **Renewed at a click.** The browser opens the window of Google only in the handler of a click. In the last
 *   minutes of the token (`margin`, 5 minutes by default), the next click of the user anywhere in the page asks for a
 *   new one: the user already agreed and is signed in to Google in this browser, so the window opens and closes at
 *   once, without any question (the address of the account is given as a hint, so that Google does not ask which
 *   account to use). If the user is no longer signed in to Google, the window asks for the account: rare.
 * - **Expired.** When the token is expired, `googleExpired` is emitted: the application shows a « Reconnect to Google »
 *   button, whose click calls `signIn()`. Meanwhile, the requests wait; they are sent once the account is connected
 *   again.
 *
 * ## The states
 *
 * `state` is `signed-out` (no account), `connected` (a valid token) or `expired` (an account, its token expired). Each
 * change emits an event, also when it comes from another tab of the site:
 *
 * | Event | Payload | When |
 * | --- | --- | --- |
 * | `googleConnected` | `{email}` | a token is received (sign in, reconnection; not a renewal before the expiry) |
 * | `googleExpired` | `{email}` | the token is expired; a click on « Reconnect » calls `signIn()` |
 * | `googleDisconnected` | `{revoked}` | `signOut()`: the token is forgotten; `revoked`: the access was also withdrawn at Google |
 *
 * ## Signing out
 *
 * `signOut()` forgets the token in this browser; `signOut({revoke: true})` also withdraws the access of the
 * application at Google (the next sign in asks for the consent again). The application erases what it keeps of the
 * user's data in this browser when it receives `googleDisconnected`. Signing out of the application does not sign the
 * user out of Google: on a shared computer, the user must also sign out of Google.
 *
 * ## The requests
 *
 * `request(url, options)` sends a request with the token, logs it (`logRequest()`, with its `source`), and returns
 * the answer read as JSON (or as text, or as a `Blob`). Without a token (expired), it waits for the reconnection;
 * signed out, it fails. A `401` answer marks the token as expired, then the request waits and is sent again once.
 * Another error fails with a `GoogleError` (`status`, `message` of Google).
 *
 * @module google
 * @fires googleConnected - A token is received.
 * @fires googleExpired - The token is expired.
 * @fires googleDisconnected - The account is signed out.
 */

import {bus} from '../core/bus.mjs'
import {secrets} from '../core/secrets.mjs'
import {schedule} from '../core/scheduler.mjs'
import {declareTasks} from '../core/microtasker.mjs'
import {logRequest} from '../core/requests.mjs'
import {loadScript} from '../utils/dom.mjs'

const LIBRARY = 'https://accounts.google.com/gsi/client'
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo'
const SECRET = 'google-account'
const CHECK = 'rcGoogleCheck' // the scheduled check of the expiry (internal event)
const MAX_LOGGED_BODY = 1000 // the characters of a body kept in the log

/** The scope to read the address of the account. */
export const GOOGLE_EMAIL = 'email'
/** The scope of the files created or opened by the application in Google Drive (no verification of the application). */
export const GOOGLE_DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file'
/** The scope of Google Tasks, read and write. */
export const GOOGLE_TASKS = 'https://www.googleapis.com/auth/tasks'

declareTasks({[CHECK]: {priority: 1, cost: 0.1}})

/**
 * An error answered by an API of Google.
 */
export class GoogleError extends Error {
  /**
   * @param {number|string} status - The HTTP status, or `signed-out`.
   * @param {string} message - The message of Google.
   */
  constructor (status, message) {
    super(message)
    this.name = 'GoogleError'
    this.status = status
  }
}

/**
 * The connection to a Google account. The application uses the `googleAccount` instance; other instances are useful
 * for tests.
 */
export class GoogleAccount {
  #store
  #oauth = null // google.accounts.oauth2, once loaded
  #given
  #now
  #client = null
  #clientId = ''
  #scopes = []
  #margin = 300000
  #account = null // {token, expiresAt, scopes, email}
  #state = 'signed-out'
  #renewing = false // a request of a token is open (at most one at a time)
  #writing = false // the account is being written to the store (its secretChanged is ours)
  #waiters = [] // the requests waiting for a token: {resolve, reject}

  /**
   * @param {{secretStore: object, oauth: object, now: Function}} [options] - `secretStore`: where the account is kept
   *   (default `secrets`); `oauth`: the object `google.accounts.oauth2` (default: the library of Google, loaded by
   *   `configure()`); `now`: the clock in milliseconds (default `Date.now`).
   */
  constructor ({secretStore = secrets, oauth = null, now = () => Date.now()} = {}) {
    this.#store = secretStore
    this.#given = oauth
    this.#now = now
  }

  /** `signed-out`, `connected` or `expired`. */
  get state () { return this.#state }

  /** Whether a valid token is held. */
  get connected () { return this.#state === 'connected' }

  /** The address of the account, or `''`. */
  get email () { return this.#account?.email ?? '' }

  /** The time of expiry of the token (milliseconds since 1970), or `0`. */
  get expiresAt () { return this.#account?.expiresAt ?? 0 }

  /** The scopes granted by the user. */
  get scopes () { return this.#account?.scopes ?? [] }

  /**
   * Whether the user granted these scopes.
   * @param {string[]} scopes - The scopes.
   * @returns {boolean}
   */
  hasScopes (scopes) { return scopes.every(scope => this.scopes.includes(scope)) }

  /**
   * Prepares the connection: loads the library of Google, takes back the account kept in this browser, and listens to
   * the clicks (renewal) and to the other tabs. To call once, at the start of the application.
   * @param {{clientId: string, scopes: string[], margin: number}} options - The client identifier; the scopes asked
   *   at sign in (`email` is always added); the delay, in seconds, before the expiry from which a click renews the
   *   token (default 300).
   * @returns {Promise<string>} The state.
   */
  async configure ({clientId, scopes = [], margin = 300}) {
    this.#clientId = clientId
    this.#scopes = [...new Set([GOOGLE_EMAIL, ...scopes])]
    this.#margin = margin * 1000
    if (this.#given !== null) {
      this.#oauth = this.#given
    } else {
      await loadScript(LIBRARY)
      this.#oauth = globalThis.google.accounts.oauth2
    }
    this.#client = this.#oauth.initTokenClient({
      client_id: clientId,
      scope: this.#scopes.join(' '),
      callback: response => this.#received(response),
      error_callback: error => this.#refused(error)
    })
    bus.on('secretChanged', ({name}) => { if (name === SECRET && !this.#writing) { this.#load() } })
    bus.on(CHECK, () => this.check())
    const page = globalThis.document
    if (typeof page?.addEventListener === 'function') {
      page.addEventListener('click', () => this.userGesture(), {capture: true})
      page.addEventListener('visibilitychange', () => { if (!page.hidden) { this.check() } })
    }
    this.#load()
    return this.#state
  }

  /**
   * Signs in, or reconnects: opens the window of Google. To call in the handler of a click.
   * @param {{scopes: string[]}} [options] - More scopes to ask for (asked once, when a view needs them: Tasks…).
   */
  signIn ({scopes = []} = {}) {
    if (this.#client === null) { throw new Error('googleAccount: configure() first') }
    if (this.#renewing) { return }
    const wanted = [...new Set([...this.#scopes, ...this.scopes, ...scopes])]
    const consent = !this.#account || !wanted.every(scope => this.scopes.includes(scope))
    this.#renewing = true
    this.#client.requestAccessToken({
      scope: wanted.join(' '),
      include_granted_scopes: true,
      prompt: consent ? 'consent' : '',
      login_hint: this.email || undefined
    })
  }

  /**
   * Signs out: forgets the token in this browser; with `revoke`, also withdraws the access of the application at
   * Google. The requests waiting for a token fail.
   * @param {{revoke: boolean}} [options]
   * @fires googleDisconnected
   */
  signOut ({revoke = false} = {}) {
    const token = this.#account?.token
    if (revoke && token && this.#oauth !== null) { this.#oauth.revoke(token, () => {}) }
    this.#set(null, {revoked: revoke})
  }

  /**
   * Called at each click of the user (capture): in the last minutes of a valid token, asks for a new one (the browser
   * allows the window of Google in a click). Once the token is expired, nothing: the application shows its
   * « Reconnect » button (`googleExpired`), so that a click elsewhere never opens the window of Google. Kernel
   * internal; public for the tests.
   */
  userGesture () {
    this.check()
    if (this.#state !== 'connected' || this.#renewing || this.#client === null) { return }
    if (this.#now() < this.#account.expiresAt - this.#margin) { return }
    this.signIn()
  }

  /**
   * Checks the expiry now (called when it is due, and when the page is shown again).
   * @returns {string} The state.
   */
  check () {
    if (this.#account !== null) { this.#set(this.#account, {stored: true}) }
    return this.#state
  }

  /**
   * A valid token, at once when connected; when expired, once the user reconnects.
   * @returns {Promise<string>} The token; rejected with a `GoogleError` (`signed-out`) when no account is connected.
   */
  token () {
    this.check()
    if (this.#state === 'connected') { return Promise.resolve(this.#account.token) }
    if (this.#state === 'signed-out') { return Promise.reject(new GoogleError('signed-out', 'No Google account is connected')) }
    return new Promise((resolve, reject) => this.#waiters.push({resolve, reject}))
  }

  /**
   * Sends a request to an API of Google, with the token, and logs it.
   * @param {string} url - The address.
   * @param {object} [options]
   * @param {string} [options.method] - `GET` (default), `POST`, `PATCH`, `PUT`, `DELETE`.
   * @param {Object<string, *>} [options.query] - The parameters added to the address.
   * @param {*} [options.body] - An object or an array is sent as JSON; a string, a `Blob` or a `FormData` as it is.
   * @param {Object<string, string>} [options.headers] - More headers.
   * @param {string} [options.source] - The source in the log of the requests (default `google`).
   * @param {string} [options.answer] - How the answer is read: `json` (default; `null` for an empty answer), `text`,
   *   `blob`.
   * @returns {Promise<*>} The answer.
   */
  async request (url, {method = 'GET', query = null, body, headers = {}, source = 'google', answer = 'json'} = {}, retried = false) {
    const token = await this.token()
    const address = query === null ? url : `${url}${url.includes('?') ? '&' : '?'}${new URLSearchParams(query)}`
    const json = body !== undefined && body !== null && typeof body === 'object' && !(body instanceof Blob) &&
      !(globalThis.FormData && body instanceof FormData)
    const init = {method, headers: {Authorization: `Bearer ${token}`, ...(json ? {'Content-Type': 'application/json'} : {}), ...headers}}
    if (body !== undefined) { init.body = json ? JSON.stringify(body) : body }
    const logged = json ? init.body.slice(0, MAX_LOGGED_BODY) : typeof body === 'string' ? body.slice(0, MAX_LOGGED_BODY) : body === undefined ? undefined : `(${body.constructor.name})`
    const begin = this.#now()
    let response
    try {
      response = await fetch(address, init)
    } catch (error) {
      logRequest({source, url: address, status: 'error', duration: this.#now() - begin, body: logged})
      throw error
    }
    logRequest({source, url: address, status: response.status, duration: this.#now() - begin, body: logged})
    if (response.status === 401 && !retried) {
      // the token was refused (expired early, or withdrawn): wait for a new one, then send the request again once
      if (this.#account?.token === token) { this.#set({...this.#account, expiresAt: 0}) }
      return this.request(url, {method, query, body, headers, source, answer}, true)
    }
    if (!response.ok) {
      let message = response.statusText
      try { message = (await response.json())?.error?.message ?? message } catch { /* not JSON */ }
      throw new GoogleError(response.status, message)
    }
    if (answer === 'text') { return response.text() }
    if (answer === 'blob') { return response.blob() }
    const text = await response.text()
    return text === '' ? null : JSON.parse(text)
  }

  // ---------------------------------------------------------------- inside

  // a token from Google
  #received (response) {
    this.#renewing = false
    if (response.error !== undefined) {
      this.#refused(response)
      return
    }
    const granted = String(response.scope ?? '').split(' ').filter(Boolean)
    const account = {
      token: response.access_token,
      expiresAt: this.#now() + Number(response.expires_in ?? 3600) * 1000,
      scopes: granted,
      email: this.#account?.email ?? ''
    }
    if (account.email !== '') {
      this.#set(account)
      return
    }
    // the first token: the address of the account is read before the account is announced
    this.#fetchEmail(account.token).then(email => this.#set({...account, email}))
  }

  // the window of Google was closed, or refused: nothing changes (the state says what is possible)
  #refused (error) {
    this.#renewing = false
    console.warn('googleAccount: no token received', error?.type ?? error?.error ?? '')
  }

  // the address of the account, read with a new token ('' when it cannot be read)
  async #fetchEmail (token) {
    const begin = this.#now()
    try {
      const response = await fetch(USERINFO, {headers: {Authorization: `Bearer ${token}`}})
      logRequest({source: 'google', url: USERINFO, status: response.status, duration: this.#now() - begin})
      return response.ok ? String((await response.json())?.email ?? '') : ''
    } catch (error) {
      logRequest({source: 'google', url: USERINFO, status: 'error', duration: this.#now() - begin})
      console.warn('googleAccount: the address of the account cannot be read', error.message)
      return ''
    }
  }

  // the account kept in this browser (at start, and when another tab changes it)
  #load () {
    let account = null
    try { account = JSON.parse(this.#store.get(SECRET) ?? 'null') } catch { account = null }
    const valid = account !== null && typeof account.token === 'string' && Number.isFinite(account.expiresAt)
    this.#set(valid ? {...account, scopes: Array.isArray(account.scopes) ? account.scopes : []} : null, {stored: true})
  }

  // the new account (or null): keeps it, plans its check, emits the change of state
  #set (account, {revoked = false, stored = false} = {}) {
    const before = this.#state
    const email = this.#account?.email ?? ''
    this.#account = account
    if (!stored) {
      this.#writing = true
      try {
        if (account === null) { this.#store.remove(SECRET) } else { this.#store.set(SECRET, JSON.stringify(account)) }
      } finally { this.#writing = false }
    }
    this.#state = account === null ? 'signed-out' : this.#now() < account.expiresAt ? 'connected' : 'expired'
    if (this.#state === 'connected') {
      const left = account.expiresAt - this.#now()
      schedule(CHECK, {}, left, {id: 'google-expiry', mode: 'restart'})
      for (const {resolve} of this.#waiters.splice(0)) { resolve(account.token) }
    }
    if (this.#state === 'signed-out') {
      for (const {reject} of this.#waiters.splice(0)) { reject(new GoogleError('signed-out', 'No Google account is connected')) }
    }
    if (this.#state === before && (this.#state !== 'connected' || this.email === email)) { return }
    if (this.#state === 'connected') { bus.emit('googleConnected', {email: this.email}) }
    if (this.#state === 'expired') { bus.emit('googleExpired', {email: this.email}) }
    if (this.#state === 'signed-out') { bus.emit('googleDisconnected', {revoked}) }
  }
}

/** The connection to the Google account of the user. */
export const googleAccount = new GoogleAccount()
