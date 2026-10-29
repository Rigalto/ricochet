// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A storage adapter that keeps the configuration items in the local database of the browser (IndexedDB): they
 * survive a reload of the page and a restart of the browser, on this computer and in this browser only, without any
 * server. For small applications served as static files, and for demonstrations.
 *
 * ```javascript
 * import {start, IndexedDBAdapter} from 'ricochet/ricochet.mjs'
 *
 * await start({storage: new IndexedDBAdapter('my-app', {'ricochet-theme': 'system'})})
 * ```
 *
 * ## Database
 *
 * Each application gives its own name: the applications served from the same site (a GitHub Pages account, for
 * instance) share the same databases, and two applications with the same name would share their items. The database
 * has one table of items, the name of the item as key and its value as value.
 *
 * The default values are used for the items that are not stored yet; they are not written to the database until the
 * application changes them.
 *
 * ## Without IndexedDB
 *
 * When the browser offers no IndexedDB, or refuses it (some private windows), the adapter warns once in the console and
 * keeps the items in memory, as `MemoryAdapter` does: the application works, without persistence.
 *
 * @module indexeddb
 * @category adapters
 */

const STORE = 'items'
const VERSION = 1

/**
 * Storage adapter for `config`, in the local database of the browser.
 */
export class IndexedDBAdapter {
  #name
  #defaults
  #db = null // promise of the open database, or null while not opened
  #memory = null // the items kept in memory when IndexedDB is not available

  /**
   * @param {string} name - Name of the database: one per application.
   * @param {object} [defaults] - Values of the items that are not stored yet, as `{item: value, …}`.
   */
  constructor (name, defaults = {}) {
    if (typeof name !== 'string' || name === '') { console.error('IndexedDBAdapter: a database name is expected') }
    this.#name = name
    this.#defaults = {...defaults}
  }

  /** The name of the database. */
  get name () { return this.#name }

  /** Whether the items are kept in memory, IndexedDB being unavailable. */
  get inMemory () { return this.#memory !== null }

  /**
   * @returns {Promise<object>} Every item, as `{item: value, …}`: the stored ones over the default values.
   */
  async load () {
    const db = await this.#open()
    if (db === null) { return {...this.#defaults, ...this.#memory} }
    const stored = await new Promise((resolve, reject) => {
      const items = {}
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (cursor === null) {
          resolve(items)
        } else {
          items[cursor.key] = cursor.value
          cursor.continue()
        }
      }
      request.onerror = () => reject(request.error)
    })
    return {...this.#defaults, ...stored}
  }

  /**
   * Stores items, in one transaction: all of them or none.
   * @param {Array<{item: string, value: string}>} entries - The items to store.
   */
  async save (entries) {
    const db = await this.#open()
    if (db === null) {
      for (const {item, value} of entries) { this.#memory[item] = value }
      return
    }
    await this.#write(db, store => { for (const {item, value} of entries) { store.put(value, item) } })
  }

  /**
   * Deletes items, in one transaction.
   * @param {string[]} items - The names of the items to delete.
   */
  async remove (items) {
    const db = await this.#open()
    if (db === null) {
      for (const item of items) { delete this.#memory[item] }
      return
    }
    await this.#write(db, store => { for (const item of items) { store.delete(item) } })
  }

  /** Closes the database; it is opened again by the next call. */
  async close () {
    const db = await this.#db
    this.#db = null
    db?.close()
  }

  // the database, opened once; null when IndexedDB is not available (the items are then kept in memory)
  #open () {
    if (this.#db !== null) { return this.#db }
    this.#db = new Promise(resolve => {
      const fallback = reason => {
        console.warn(`IndexedDBAdapter: no local database (${reason}), the items are kept in memory`)
        this.#memory = this.#memory ?? {}
        resolve(null)
      }
      if (typeof indexedDB === 'undefined') {
        fallback('IndexedDB is not available')
        return
      }
      let request
      try {
        request = indexedDB.open(this.#name, VERSION)
      } catch (error) {
        fallback(error.message)
        return
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) { request.result.createObjectStore(STORE) }
      }
      request.onsuccess = () => {
        const db = request.result
        // another tab opens a newer version: this one lets it go, and opens again at the next call
        db.onversionchange = () => {
          db.close()
          this.#db = null
        }
        resolve(db)
      }
      request.onerror = () => fallback(request.error?.message ?? 'refused')
    })
    return this.#db
  }

  // a write transaction, resolved when it is committed
  #write (db, fill) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      fill(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDBAdapter: transaction aborted'))
    })
  }
}
