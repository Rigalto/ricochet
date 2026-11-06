// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The Google demo: the connection to a Google account (`adapters/google.mjs`) without any server — sign in, the
 * token kept and renewed, the expiry and the « Reconnect » button, signing out — and a few requests: the files that
 * this demo created in Google Drive, a new file, the lists of Google Tasks.
 *
 * The client identifier of the Google Cloud project is typed in the page (a configuration item kept in the local
 * database of the browser): it is public, but each copy of the demo has its own project, whose authorized JavaScript
 * origins include the address of the page.
 *
 * @module google-demo
 */

import {WComponent, css, escapeHtml} from 'ricochet/ricochet.mjs'
import {googleAccount, GoogleError, GOOGLE_DRIVE_FILE, GOOGLE_TASKS} from 'ricochet/adapters/google.mjs'

const CLIENT_ITEM = 'google-demo-client-id'
const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const TASKLISTS = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists'

css(`
google-demo { display: grid; gap: 1rem; }
google-demo .gd-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
google-demo .gd-row > rc-input { flex: 1 1 20rem; }
google-demo .gd-state { display: grid; grid-template-columns: max-content 1fr; gap: .2rem 1rem; }
google-demo .gd-state > dt { color: var(--rc-text-muted); }
google-demo .gd-state > dd { margin: 0; color: var(--rc-text-strong); overflow-wrap: anywhere; }
google-demo .gd-banner { padding: .6rem .8rem; border-radius: .4rem; display: flex; gap: .8rem; align-items: center; flex-wrap: wrap; }
google-demo .gd-banner[hidden] { display: none; }
google-demo .gd-out { margin: 0; padding: .6rem .8rem; border-radius: .4rem; background: var(--rc-surface); white-space: pre-wrap;
  max-height: 18rem; overflow: auto; font-size: .9em; }
`, {name: 'google-demo'})

/**
 * The page of the demo: the client identifier, the state of the connection and its buttons, a few requests.
 *
 * ```html
 * <google-demo></google-demo>
 * ```
 *
 * @listens googleConnected - The account is connected: the state is shown again.
 * @listens googleExpired - The token is expired: the « Reconnect » banner.
 * @listens googleDisconnected - Signed out.
 * @listens googleDemoTick - (internal) The time left, every second.
 */
export class GoogleDemo extends WComponent {
  attach () {
    this.innerHTML(/* html */ `
      <div class="gd-row">
        <rc-input name="client" placeholder="Client identifier (….apps.googleusercontent.com)" label="Client identifier" commit="change"></rc-input>
        <rc-text-button name="apply">Use it</rc-text-button>
      </div>
      <div class="gd-banner" state="warning" hidden>
        <span>The token is expired: the requests wait.</span>
        <rc-text-button name="reconnect">Reconnect to Google</rc-text-button>
      </div>
      <dl class="gd-state"></dl>
      <div class="gd-row">
        <rc-text-button name="signin">Sign in with Google</rc-text-button>
        <rc-text-button name="signout">Sign out</rc-text-button>
        <rc-text-button name="revoke">Sign out and withdraw the access</rc-text-button>
      </div>
      <div class="gd-row">
        <rc-text-button name="files">Files of this demo in Drive</rc-text-button>
        <rc-text-button name="create">Create a file</rc-text-button>
        <rc-text-button name="tasks">Lists of Tasks</rc-text-button>
      </div>
      <pre class="gd-out" aria-live="polite"></pre>`)
    this.elClient = this.element.querySelector('[name="client"]')
    this.elBanner = this.element.querySelector('.gd-banner')
    this.elState = this.element.querySelector('.gd-state')
    this.elOut = this.element.querySelector('.gd-out')
    // the buttons that open the window of Google are handled in the click itself (DOM events, not the bus)
    for (const name of ['apply', 'reconnect', 'signin', 'signout', 'revoke', 'files', 'create', 'tasks']) {
      this.observeDom(this.element.querySelector(`[name="${name}"]`), 'click', `${name}Clicked`)
    }
    this.listen(['googleConnected', 'googleExpired', 'googleDisconnected', 'googleDemoTick'])
    this.observeItems([CLIENT_ITEM])
  }

  itemsChanged (items) {
    const clientId = items[CLIENT_ITEM] ?? ''
    this.elClient.setAttribute('value', clientId)
    if (clientId !== '' && this.clientId === undefined) {
      this.clientId = clientId
      googleAccount.configure({clientId, scopes: [GOOGLE_DRIVE_FILE]})
        .then(() => this.#show())
        .catch(error => this.#print(`The library of Google cannot be loaded: ${error.message}`))
    }
    this.#show()
  }

  applyClicked () {
    const value = (this.elClient._component?.value ?? '').trim()
    if (value === '') { return }
    this.setItem(CLIENT_ITEM, value)
    if (this.clientId !== undefined && value !== this.clientId) { this.#print('Reload the page to use the new identifier.') }
  }

  signinClicked () { this.#sign(() => googleAccount.signIn()) }
  reconnectClicked () { this.#sign(() => googleAccount.signIn()) }
  signoutClicked () { googleAccount.signOut() }
  revokeClicked () { googleAccount.signOut({revoke: true}) }

  filesClicked () {
    this.#run(async () => {
      const {files} = await googleAccount.request(DRIVE, {query: {q: 'trashed = false', fields: 'files(id, name, modifiedTime)', pageSize: 20}, source: 'drive'})
      return files.length === 0 ? 'No file yet: this demo sees only the files it created.' : files.map(f => `${f.name}  (${f.modifiedTime})`).join('\n')
    })
  }

  createClicked () {
    this.#run(async () => {
      const name = `Ricochet demo ${new Date().toISOString().slice(0, 19).replace('T', ' ')}.txt`
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify({name, mimeType: 'text/plain'})], {type: 'application/json'}))
      form.append('file', new Blob(['Created by the Google demo of Ricochet.\n'], {type: 'text/plain'}))
      const file = await googleAccount.request(UPLOAD, {method: 'POST', query: {uploadType: 'multipart'}, body: form, source: 'drive'})
      return `Created: ${file.name} (${file.id})`
    })
  }

  tasksClicked () {
    if (!googleAccount.hasScopes([GOOGLE_TASKS])) {
      // the scope of Tasks is asked only when it is needed, in the click
      this.#sign(() => googleAccount.signIn({scopes: [GOOGLE_TASKS]}))
      this.#print('Access to Tasks asked: click « Lists of Tasks » again once granted.')
      return
    }
    this.#run(async () => {
      const {items = []} = await googleAccount.request(TASKLISTS, {source: 'tasks'})
      return items.map(list => `${list.title}  (updated ${list.updated})`).join('\n') || 'No list.'
    })
  }

  googleConnectedDispatched () { this.#show() }
  googleExpiredDispatched () { this.#show() }
  googleDisconnectedDispatched ({revoked}) {
    this.#show()
    this.#print(revoked ? 'Signed out, access withdrawn at Google.' : 'Signed out. On a shared computer, also sign out of Google.')
  }

  googleDemoTickDispatched () { this.#show() }

  #sign (action) {
    try { action() } catch (error) { this.#print(error.message) }
  }

  #run (work) {
    this.#print('…')
    work().then(text => this.#print(text), error => this.#print(error instanceof GoogleError ? `${error.status}: ${error.message}` : String(error)))
  }

  #print (text) { this.elOut.textContent = text }

  #show () {
    const state = googleAccount.state
    const left = Math.max(0, Math.round((googleAccount.expiresAt - Date.now()) / 1000))
    const rows = [
      ['State', state],
      ['Account', googleAccount.email || '—'],
      ['Token', state === 'signed-out' ? '—' : state === 'expired' ? 'expired' : `${Math.floor(left / 60)} min ${left % 60} s left`],
      ['Scopes', googleAccount.scopes.join(' ') || '—']
    ]
    this.elState.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${escapeHtml(value)}</dd>`).join('')
    this.elBanner.hidden = state !== 'expired'
    if (state === 'connected') { this.schedule('googleDemoTick', {}, 1000, {id: 'google-demo-tick', mode: 'restart'}) }
  }
}
WComponent.define('google-demo', GoogleDemo)
