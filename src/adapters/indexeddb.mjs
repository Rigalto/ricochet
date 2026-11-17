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
 * instance) share the same databases, and two applications with the same name would share their items. The items are
 * in the store `items` of the database, the name of the item as key and its value as value.
 *
 * The database of the application holds the other local data of Ricochet too: the copies of the tables kept in Google
 * spreadsheets (store `tables`, see `DriveSheet`). Each part asks for its stores with `openAppDatabase(name, stores)`:
 * a missing store is created by moving the database to its next version, once, without losing the others. No version
 * number is kept anywhere. A page still running an older code at that moment closes its connection (`versionchange`);
 * if that older code asked for a fixed version, it can no longer open the database, and keeps its items in memory
 * until the page is reloaded.
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
const SAVE_DELAY = 100
const ATTEMPTS = 5 // two parts of the page may add stores at the same time: the database is opened again

// opens a database, at its current version (undefined) or at a given one, creating the missing stores
const openAt = (name, stores, version) => new Promise((resolve, reject) => {
  let request
  try {
    request = version === undefined ? indexedDB.open(name) : indexedDB.open(name, version)
  } catch (error) {
    reject(error)
    return
  }
  request.onupgradeneeded = () => {
    for (const store of stores) { if (!request.result.objectStoreNames.contains(store)) { request.result.createObjectStore(store) } }
  }
  request.onsuccess = () => {
    // by default, the connection lets a newer version go (the caller sets its own handler, to open again): otherwise an
    // upgrade asked meanwhile would wait for it
    request.result.onversionchange = () => request.result.close()
    resolve(request.result)
  }
  request.onerror = () => reject(request.error ?? new Error('refused'))
  // request.onblocked: another page keeps the database open at the former version; the request waits for it to close
})

/**
 * Opens the local database of an application with the stores it needs: a store that is missing is created, the
 * database moving to its next version (the other stores and their records are kept). A database that does not exist
 * yet is created with these stores. The connection is the caller's: it is closed on `versionchange` (another part of
 * the page, or another page, adds a store); the caller replaces `onversionchange` to know it, and opens the database
 * again when it needs it.
 * @param {string} name - The name of the database: one per application.
 * @param {string[]} stores - The names of the stores needed.
 * @returns {Promise<IDBDatabase>} The open database; rejected when IndexedDB is not available, or refused.
 */
export async function openAppDatabase (name, stores) {
  if (typeof indexedDB === 'undefined') { throw new Error('IndexedDB is not available') }
  for (let attempt = 1; ; attempt++) {
    const db = await openAt(name, stores)
    if (stores.every(store => db.objectStoreNames.contains(store))) { return db }
    const version = db.version + 1
    db.close()
    try {
      const upgraded = await openAt(name, stores, version)
      if (stores.every(store => upgraded.objectStoreNames.contains(store))) { return upgraded }
      upgraded.close() // upgraded meanwhile by another part, for other stores: once more
    } catch (error) {
      if (error?.name !== 'VersionError' || attempt >= ATTEMPTS) { throw error }
    }
  }
}

/**
 * Storage adapter for `config`, in the local database of the browser.
 */
export class IndexedDBAdapter {
  #name
  #defaults
  #db = null // promise of the open database, or null while not opened
  #opened = null // the open database itself, once the promise is resolved: the writes start without waiting
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

  /**
   * Delay before the changes are saved, in milliseconds: short, the writes in the local database being cheap. Read by
   * the store, in place of its own delay (2 seconds, made for a server): a change is saved before a reload, even an
   * early one; a write started while the page is being closed is not always completed by the browser.
   */
  get saveDelay () { return SAVE_DELAY }

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
    // the database already open: the transaction starts at once, in the same task (see #write)
    const db = this.#opened ?? await this.#open()
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
    const db = this.#opened ?? await this.#open()
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
    this.#opened = null
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
      openAppDatabase(this.#name, [STORE]).then(db => {
        // another part of the page, or another tab, adds a store: this connection lets it go, and opens again at the
        // next call
        db.onversionchange = () => {
          db.close()
          this.#db = null
          this.#opened = null
        }
        this.#opened = db
        resolve(db)
      }, error => fallback(error?.message ?? 'refused'))
    })
    return this.#db
  }

  // a write transaction, resolved when it is committed; it is created and committed at once, in the task of the call:
  // when the page is being closed (pagehide), a transaction started later, after an await, is lost
  #write (db, fill) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite')
      fill(transaction.objectStore(STORE))
      transaction.commit?.() // no more requests: committed without waiting for the end of the task
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDBAdapter: transaction aborted'))
    })
  }
}
