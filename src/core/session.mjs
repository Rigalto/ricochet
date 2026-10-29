// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The store of the session: state that lives as long as the tab, survives a reload of the page, and is not worth a
 * configuration item (the pages seen lately, the place in a list, a draft). One instance, `session`, serves the whole
 * application.
 *
 * ```javascript
 * import {session} from 'ricochet/ricochet.mjs'
 *
 * session.set('history', [{path: '#hom/not'}])   // any value that JSON can write
 * const history = session.get('history', [])     // the default when nothing is stored
 * ```
 *
 * ## Session and configuration items
 *
 * | | Configuration items (`config`) | Session (`session`) |
 * | --- | --- | --- |
 * | lives | until changed | as long as the tab: a reload keeps it, a new tab starts empty |
 * | stored | by the adapter of the application (a server, Drive, the local database) | in the browser (`sessionStorage`), never sent anywhere |
 * | values | strings | anything JSON can write |
 * | changes | observers, logs | none: read when needed |
 *
 * A name is a short identifier chosen by the application, prefixed by the store in the storage of the browser
 * (`ricochet-session-<name>`). A value is written at once (`set()` is synchronous): it is not lost when the page is
 * closed just after.
 *
 * When the browser offers no session storage, or refuses it (some private windows), the store warns once in the
 * console and keeps the values in memory: they are lost when the page is reloaded.
 *
 * @module session
 */

const PREFIX = 'ricochet-session-'

/**
 * A store of session values. The application uses the `session` instance; other instances are useful for tests.
 */
export class SessionStore {
  #storage // the Storage object (sessionStorage), or a Map when it is not available; resolved at the first use
  #given
  #prefix

  /**
   * @param {{storage: Storage, prefix: string}} [options] - `storage`: the object that keeps the values, with the
   *   interface of `sessionStorage` (default: `sessionStorage`); `prefix` of the keys in the storage (default
   *   `ricochet-session-`).
   */
  constructor ({storage = null, prefix = PREFIX} = {}) {
    this.#given = storage
    this.#prefix = prefix
  }

  /** Whether the values are kept in memory only, the session storage being unavailable. */
  get inMemory () { return this.#store() instanceof Map }

  /**
   * @param {string} name - Name of the value.
   * @param {*} [fallback] - Returned when nothing is stored, or when the stored text is not JSON.
   * @returns {*} The stored value (a new copy at each call), or `fallback`.
   */
  get (name, fallback = null) {
    if (!this.#valid(name)) { return fallback }
    const store = this.#store()
    const text = store instanceof Map ? store.get(name) : store.getItem(this.#prefix + name)
    if (text === null || text === undefined) { return fallback }
    try {
      return JSON.parse(text)
    } catch {
      return fallback
    }
  }

  /**
   * Stores a value, at once; `undefined` removes it.
   * @param {string} name - Name of the value.
   * @param {*} value - Any value that JSON can write.
   */
  set (name, value) {
    if (!this.#valid(name)) { return }
    if (value === undefined) {
      this.remove(name)
      return
    }
    const store = this.#store()
    try {
      const text = JSON.stringify(value)
      if (store instanceof Map) { store.set(name, text) } else { store.setItem(this.#prefix + name, text) }
    } catch (error) {
      // a value JSON cannot write, or a full storage: the value is not kept
      console.error(`session: the value "${name}" cannot be stored (${error.message})`)
    }
  }

  /**
   * Removes a value.
   * @param {string} name - Name of the value.
   */
  remove (name) {
    if (!this.#valid(name)) { return }
    const store = this.#store()
    if (store instanceof Map) { store.delete(name) } else { store.removeItem(this.#prefix + name) }
  }

  /**
   * @returns {string[]} The names of the stored values, in alphabetical order.
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
    console.error('session: a name is expected')
    return false
  }

  // the storage, found at the first use; a Map when the session storage is not available
  #store () {
    if (this.#storage !== undefined) { return this.#storage }
    let storage = this.#given
    if (storage === null) {
      try {
        storage = globalThis.sessionStorage ?? null
        storage?.getItem(this.#prefix) // a refused storage throws here, not when it is read as a property
      } catch {
        storage = null
      }
    }
    if (storage === null) {
      console.warn('session: no session storage, the values are kept in memory until the page is reloaded')
      storage = new Map()
    }
    this.#storage = storage
    return storage
  }
}

/** The store of the session of the application. */
export const session = new SessionStore()
