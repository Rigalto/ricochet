// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The store of secrets: API keys, tokens, passwords that the user gives to the application, and that must stay on
 * this computer. One instance, `secrets`, serves the whole application.
 *
 * ```javascript
 * import {secrets} from 'ricochet/ricochet.mjs'
 *
 * secrets.set('aqicn', token)        // given by the user in a field of the interface
 * const token = secrets.get('aqicn') // null when the user has not given it yet
 * ```
 *
 * ## Secrets and configuration items
 *
 * A secret is not a configuration item. The configuration items go through the adapter of the application, to a
 * server or a shared file, and are written to the logs of debugging; a secret never leaves the browser:
 *
 * - it is kept in the local storage of the browser (`localStorage`), never given to an adapter nor sent anywhere by
 *   the kernel;
 * - its value is never written to the logs, nor to the console, nor in the payload of an event;
 * - it is read at once (`get()` is synchronous): a view reads its key when it sends its request.
 *
 * A name is a short identifier chosen by the application (`aqicn`, `mqtt-password`). The value is a string; spaces
 * around it are removed (a key copied from a web page often carries one), and an empty value removes the secret.
 *
 * ## Changes
 *
 * `set()` and `remove()` emit `secretChanged {name}`, without the value: a view that waits for its key listens to it
 * and sends its request again. The event is also emitted when the secret is changed in another tab of the same site.
 *
 * ## One browser, one computer
 *
 * A secret is kept for this browser on this computer: in another browser, on another computer (or after the data of the
 * site is cleared), the user gives it again. The interface that asks for it says so, and tells where to find it.
 *
 * ## Safety
 *
 * The local storage of the browser is not a safe. It is shared by every page of the same origin (the same scheme,
 * host and port): on `https://user.github.io`, every application of the account reads the secrets of the others —
 * fine when they are all yours. Anyone who uses this browser session can read them in the tools of the browser. The
 * store keeps secrets out of the code, out of the repository and out of the servers; it does not hide them from the
 * user of the computer.
 *
 * When the browser offers no local storage, or refuses it (some private windows), the store warns once in the console
 * and keeps the secrets in memory: they are lost when the page is closed.
 *
 * @module secrets
 * @fires secretChanged - A secret is set or removed.
 */

import {bus} from './bus.mjs'

const PREFIX = 'ricochet-secret-'

/**
 * A store of secrets. The application uses the `secrets` instance; other instances are useful for tests.
 */
export class SecretStore {
  #storage // the Storage object (localStorage), or a Map when it is not available; resolved at the first use
  #given
  #prefix
  #listening = false

  /**
   * @param {{storage: Storage, prefix: string}} [options] - `storage`: the object that keeps the secrets, with the
   *   interface of `localStorage` (default: `localStorage`); `prefix` of the keys in the storage (default
   *   `ricochet-secret-`).
   */
  constructor ({storage = null, prefix = PREFIX} = {}) {
    this.#given = storage
    this.#prefix = prefix
  }

  /** Whether the secrets are kept in memory only, the local storage being unavailable. */
  get inMemory () { return this.#store() instanceof Map }

  /**
   * @param {string} name - Name of the secret.
   * @returns {string|null} The value of the secret, or `null` when it is not set.
   */
  get (name) {
    if (!this.#valid(name)) { return null }
    const store = this.#store()
    return (store instanceof Map ? store.get(name) : store.getItem(this.#prefix + name)) ?? null
  }

  /**
   * @param {string} name - Name of the secret.
   * @returns {boolean} Whether the secret is set.
   */
  has (name) { return this.get(name) !== null }

  /**
   * Sets a secret; an empty value (after removing the spaces around it) removes it.
   * @param {string} name - Name of the secret.
   * @param {string} value - Its value.
   * @fires secretChanged
   */
  set (name, value) {
    if (!this.#valid(name)) { return }
    const text = String(value ?? '').trim()
    if (text === '') {
      this.remove(name)
      return
    }
    if (this.get(name) === text) { return }
    const store = this.#store()
    try {
      if (store instanceof Map) { store.set(name, text) } else { store.setItem(this.#prefix + name, text) }
    } catch (error) {
      // the storage is full or refused: the secret is not kept, the application is told by the console only
      console.error(`secrets: the secret "${name}" cannot be stored (${error.message})`)
      return
    }
    bus.emit('secretChanged', {name})
  }

  /**
   * Removes a secret.
   * @param {string} name - Name of the secret.
   * @fires secretChanged
   */
  remove (name) {
    if (!this.has(name)) { return }
    const store = this.#store()
    if (store instanceof Map) { store.delete(name) } else { store.removeItem(this.#prefix + name) }
    bus.emit('secretChanged', {name})
  }

  /**
   * @returns {string[]} The names of the secrets that are set, in alphabetical order.
   */
  names () {
    const store = this.#store()
    if (store instanceof Map) { return [...store.keys()].sort() }
    const names = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key?.startsWith(this.#prefix)) { names.push(key.slice(this.#prefix.length)) }
    }
    return names.sort()
  }

  #valid (name) {
    if (typeof name === 'string' && name !== '') { return true }
    console.error('secrets: a name is expected')
    return false
  }

  // the storage, found at the first use; a Map when the local storage is not available
  #store () {
    if (this.#storage !== undefined) { return this.#storage }
    let storage = this.#given
    if (storage === null) {
      try {
        storage = globalThis.localStorage ?? null
        storage?.getItem(this.#prefix) // a refused storage throws here, not when it is read as a property
      } catch {
        storage = null
      }
    }
    if (storage === null) {
      console.warn('secrets: no local storage, the secrets are kept in memory until the page is closed')
      this.#storage = new Map()
      return this.#storage
    }
    this.#storage = storage
    this.#listenOtherTabs()
    return storage
  }

  // a secret changed in another tab of the same site: the page is told as for its own changes
  #listenOtherTabs () {
    if (this.#listening || typeof window === 'undefined' || this.#storage !== globalThis.localStorage) { return }
    this.#listening = true
    window.addEventListener('storage', event => {
      if (event.storageArea !== this.#storage || !event.key?.startsWith(this.#prefix)) { return }
      bus.emit('secretChanged', {name: event.key.slice(this.#prefix.length)})
    })
  }
}

/** The store of secrets of the application. */
export const secrets = new SecretStore()
