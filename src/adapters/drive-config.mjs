// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A storage adapter that keeps the configuration items in the Google Drive of the user, with a local copy in the
 * browser: the application starts at once from the local copy, works without Google, and Drive becomes the reference
 * as soon as the user is connected.
 *
 * ```javascript
 * import {start, IndexedDBAdapter} from 'ricochet/ricochet.mjs'
 * import {googleAccount} from 'ricochet/adapters/google.mjs'
 * import {DriveConfigAdapter} from 'ricochet/adapters/drive-config.mjs'
 *
 * const storage = new DriveConfigAdapter({
 *   name: 'my-app',                                         // the local copy and the file in Drive
 *   local: new IndexedDBAdapter('my-app', {'ricochet-theme': 'system'}),
 *   account: googleAccount,                                 // configured by the application
 *   folder: 'My app'                                        // the folder of the file in Drive
 * })
 * await start({storage})
 * ```
 *
 * ## The local copy
 *
 * Every change is written first to the local adapter (IndexedDB), at once: nothing is lost when the page is closed,
 * whether the user is connected or not. The names of the items changed since the last copy to Drive are kept in the
 * local storage of the browser (`ricochet-drive-config-<name>`), with the identifier of the file in Drive.
 *
 * ## Drive
 *
 * The items are one JSON file (`configuration.json` by default) in a folder of the Drive of the user, created by the
 * adapter; with the scope `drive.file`, the application sees only this file and the folder. The user can read it in
 * Drive.
 *
 * - **Once per page, as soon as the account is connected** (at the start, or later when the user signs in): the
 *   file is read; the items changed in Drive (by another computer, another tab) and not changed here are copied into
 *   the local copy, then the store is loaded again (`configRefreshed`). The first time, when there is no file yet, it
 *   is created with the local items: they are copied into Drive.
 * - **After a change**, the items changed here are copied into Drive a few seconds later (`uploadDelay`, 5 seconds by
 *   default), merged with the file as it is in Drive: an item changed by another tab and not here is kept. The last
 *   change of an item wins.
 * - **Not connected, or token expired**: the changes wait in the local copy, and are copied into Drive at the next
 *   connection.
 * - **No permanent synchronization**: after the start, the changes made elsewhere are not taken back (until `pull()`,
 *   the « refresh » of the application); two tabs may keep different settings.
 *
 * ## Seed
 *
 * `seed`, optional, gives the items of a former storage (an HTTP server…), read once on this browser, the first time
 * the adapter loads, while no file of Drive is known: used when an application moves to Drive.
 *
 * ## Signing out
 *
 * `forget()` erases the local copy and what the adapter knows of Drive: to call when the user signs out (on a shared
 * computer, the settings of the user must not stay). The store is then loaded again: the default values.
 *
 * @module drive-config
 * @category adapters
 * @listens googleConnected - The account is connected: the first reading of Drive, or the changes that wait.
 */

import {bus} from '../core/bus.mjs'
import {config} from '../core/config.mjs'

const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_TYPE = 'application/vnd.google-apps.folder'
const META_PREFIX = 'ricochet-drive-config-'
const PROPERTY = 'ricochetConfig' // the property of the file in Drive: the name of the adapter

// the place of the meta data: the local storage, or memory when it is not available
const localStore = () => {
  try {
    const storage = globalThis.localStorage
    return typeof storage?.getItem === 'function' ? storage : null
  } catch {
    return null
  }
}

/**
 * Storage adapter for `config`: a local copy, and the Google Drive of the user.
 */
export class DriveConfigAdapter {
  #name
  #local
  #account
  #folder
  #file
  #seed
  #uploadDelay
  #store
  #config
  #memoryMeta = null // the meta data {fileId, pending: {item: 'set'|'remove'}, seeded}, without local storage
  #pulled = false // Drive read once in this page
  #running = null // the synchronization in progress (promise), one at a time
  #again = false // another synchronization asked while one is running
  #timer = null
  #listening = false

  /**
   * @param {object} options
   * @param {string} options.name - The name of the application: the meta data in the local storage, the property of
   *   the file in Drive.
   * @param {object} options.local - The local adapter (`IndexedDBAdapter`), with its default values.
   * @param {object} options.account - The Google account (`googleAccount` of `adapters/google.mjs`, configured).
   * @param {string} [options.folder] - The folder of the file in Drive (default: the name).
   * @param {string} [options.file] - The name of the file (default `configuration.json`).
   * @param {Function} [options.seed] - `async () => ({item: value, …})`: the items of a former storage, read once.
   * @param {number} [options.uploadDelay] - The delay before a change is copied into Drive, in ms (default 5000).
   * @param {Storage} [options.storage] - Where the meta data are kept (default `localStorage`); for the tests.
   * @param {object} [options.store] - The store loaded again after a change from Drive (default `config`); for the tests.
   */
  constructor ({name, local, account, folder = name, file = 'configuration.json', seed = null, uploadDelay = 5000, storage, store = config}) {
    this.#config = store
    this.#name = name
    this.#local = local
    this.#account = account
    this.#folder = folder
    this.#file = file
    this.#seed = seed
    this.#uploadDelay = uploadDelay
    this.#store = storage === undefined ? localStore() : storage
  }

  /** The delay of the store before it saves: the one of the local adapter (the local copy is written at once). */
  get saveDelay () { return this.#local.saveDelay }

  /** The names of the items changed here and not copied into Drive yet. */
  get pending () { return Object.keys(this.#readMeta().pending) }

  /** Whether Drive was read in this page. */
  get pulled () { return this.#pulled }

  /**
   * @returns {Promise<object>} Every item, from the local copy (and the seed, the first time).
   */
  async load () {
    this.#listen()
    const meta = this.#readMeta()
    if (this.#seed !== null && !meta.seeded && meta.fileId === null) {
      try {
        const items = await this.#seed()
        const entries = Object.entries(items ?? {}).map(([item, value]) => ({item, value}))
        if (entries.length > 0) { await this.#local.save(entries) }
        this.#writeMeta({...this.#readMeta(), seeded: true})
      } catch (error) {
        console.warn('DriveConfigAdapter: the former items cannot be read, they will be asked again at the next start', error.message)
      }
    }
    const items = await this.#local.load()
    if (!this.#pulled && this.#account.connected) { this.sync() }
    return items
  }

  /**
   * Stores items: at once in the local copy, later in Drive.
   * @param {Array<{item: string, value: string}>} entries - The items to store.
   * @param {{keepalive: boolean}} [options] - `keepalive`: the page is being closed (the copy into Drive waits for the
   *   next start).
   */
  async save (entries, options = {}) {
    const saving = this.#local.save(entries, options) // started in this task (the page may be closing)
    this.#mark(entries.map(({item}) => item), 'set')
    await saving
    if (!options.keepalive) { this.#later() }
  }

  /**
   * Deletes items: at once in the local copy, later in Drive.
   * @param {string[]} items - The names of the items.
   */
  async remove (items) {
    const removing = this.#local.remove(items)
    this.#mark(items, 'remove')
    await removing
    this.#later()
  }

  /**
   * Copies into Drive, now, the changes that wait (and reads Drive, the first time in the page). Without a connection,
   * does nothing: the changes wait for the next one.
   * @returns {Promise<void>}
   */
  sync () {
    if (!this.#account.connected) { return Promise.resolve() }
    if (this.#running !== null) {
      this.#again = true
      return this.#running
    }
    this.#running = this.#synchronize()
      .catch(error => console.warn('DriveConfigAdapter: Drive cannot be reached, the changes wait', error.message))
      .finally(() => {
        this.#running = null
        if (this.#again) {
          this.#again = false
          this.sync()
        }
      })
    return this.#running
  }

  /**
   * Reads Drive again, as at the start (the « refresh » of the application): the items changed in Drive and not here
   * come into the local copy, then the store is loaded again. Without a connection, does nothing.
   * @returns {Promise<void>}
   */
  pull () {
    this.#pulled = false
    return this.sync()
  }

  /**
   * Erases the local copy and what is known of Drive (the file in Drive is kept), then loads the store again: the
   * default values. To call when the user signs out.
   * @returns {Promise<void>}
   */
  async forget () {
    clearTimeout(this.#timer)
    this.#timer = null
    const items = Object.keys(await this.#local.load())
    if (items.length > 0) { await this.#local.remove(items) }
    this.#writeMeta({fileId: null, pending: {}, seeded: true})
    this.#pulled = false
    await this.#config.load()
  }

  // ---------------------------------------------------------------- inside

  #listen () {
    if (this.#listening) { return }
    this.#listening = true
    bus.on('googleConnected', () => this.sync())
  }

  // the copy into Drive, a few seconds after the last change
  #later () {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.#timer = null
      this.sync()
    }, this.#uploadDelay)
    this.#timer?.unref?.() // Node: does not keep the tests running
  }

  #mark (items, change) {
    const meta = this.#readMeta()
    for (const item of items) { meta.pending[item] = change }
    this.#writeMeta(meta)
  }

  async #synchronize () {
    const meta = this.#readMeta()
    let fileId = meta.fileId ?? await this.#find()
    if (fileId === null) {
      // the first time: the local items become the file in Drive
      await this.#create(await this.#local.load())
      this.#pulled = true
      return
    }
    let remote
    try {
      remote = await this.#account.request(`${DRIVE}/${fileId}`, {query: {alt: 'media'}, source: 'drive'}) ?? {}
    } catch (error) {
      if (error.status !== 404) { throw error }
      // the file was deleted in Drive: created again with the local items
      this.#writeMeta({...this.#readMeta(), fileId: null})
      await this.#create(await this.#local.load())
      this.#pulled = true
      return
    }
    if (meta.fileId === null) { this.#writeMeta({...this.#readMeta(), fileId}) }
    const pending = {...this.#readMeta().pending}
    // the first time in the page: the items changed in Drive, not here, come into the local copy
    if (!this.#pulled) {
      const local = await this.#local.load()
      const changed = Object.entries(remote)
        .filter(([item, value]) => pending[item] === undefined && typeof value === 'string' && local[item] !== value)
        .map(([item, value]) => ({item, value}))
      this.#pulled = true
      if (changed.length > 0) {
        await this.#local.save(changed)
        await this.#config.load() // the store takes them: configRefreshed
      }
    }
    // the changes made here go into Drive, merged with the file as it is there
    if (Object.keys(pending).length === 0) { return }
    const local = await this.#local.load()
    const merged = {...remote}
    for (const [item, change] of Object.entries(pending)) {
      if (change === 'remove' || local[item] === undefined) { delete merged[item] } else { merged[item] = local[item] }
    }
    await this.#account.request(`${UPLOAD}/${fileId}`, {
      method: 'PATCH', query: {uploadType: 'media'}, body: JSON.stringify(merged, null, 1),
      headers: {'Content-Type': 'application/json'}, source: 'drive'
    })
    this.#settle(pending)
  }

  // the changes copied into Drive are no longer pending, unless they changed again meanwhile
  #settle (copied) {
    const meta = this.#readMeta()
    for (const [item, change] of Object.entries(copied)) { if (meta.pending[item] === change) { delete meta.pending[item] } }
    this.#writeMeta(meta)
  }

  // the file of this adapter in Drive (its property), or null
  async #find () {
    const {files = []} = await this.#account.request(DRIVE, {
      query: {q: `appProperties has { key='${PROPERTY}' and value='${this.#name}' } and trashed = false`, fields: 'files(id)', spaces: 'drive'},
      source: 'drive'
    }) ?? {}
    return files[0]?.id ?? null
  }

  // the folder of the file, created if needed
  async #folderId () {
    const name = this.#folder.replaceAll("'", "\\'")
    const {files = []} = await this.#account.request(DRIVE, {
      query: {q: `name = '${name}' and mimeType = '${FOLDER_TYPE}' and trashed = false`, fields: 'files(id)', spaces: 'drive'},
      source: 'drive'
    }) ?? {}
    if (files.length > 0) { return files[0].id }
    const folder = await this.#account.request(DRIVE, {method: 'POST', body: {name: this.#folder, mimeType: FOLDER_TYPE}, query: {fields: 'id'}, source: 'drive'})
    return folder.id
  }

  // the file, created with the local items
  async #create (items) {
    const pending = {...this.#readMeta().pending}
    const parent = await this.#folderId()
    const form = new FormData()
    const metadata = {name: this.#file, mimeType: 'application/json', parents: [parent], appProperties: {[PROPERTY]: this.#name}}
    form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}))
    form.append('file', new Blob([JSON.stringify(items, null, 1)], {type: 'application/json'}))
    const file = await this.#account.request(UPLOAD, {method: 'POST', query: {uploadType: 'multipart', fields: 'id'}, body: form, source: 'drive'})
    this.#writeMeta({...this.#readMeta(), fileId: file.id})
    this.#settle(pending)
  }

  // the meta data, read again each time: another tab of the site may have changed them
  #readMeta () {
    let meta = this.#memoryMeta
    if (meta === null) {
      try { meta = JSON.parse(this.#store?.getItem(META_PREFIX + this.#name) ?? 'null') } catch { meta = null }
    }
    meta = meta ?? {}
    return {fileId: meta.fileId ?? null, pending: {...meta.pending}, seeded: meta.seeded === true}
  }

  #writeMeta (meta) {
    const copy = {fileId: meta.fileId, pending: {...meta.pending}, seeded: meta.seeded}
    if (this.#store === null || this.#memoryMeta !== null) {
      this.#memoryMeta = copy
      return
    }
    try { this.#store.setItem(META_PREFIX + this.#name, JSON.stringify(copy)) } catch (error) {
      this.#memoryMeta = copy
      console.warn('DriveConfigAdapter: the local storage refuses the meta data', error.message)
    }
  }
}
