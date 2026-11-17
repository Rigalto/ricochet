// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A table kept in a tab of a Google spreadsheet, in the Drive of the user, with a local copy in the browser: the rows
 * are objects whose keys are the headers of the tab; one column (`key`) identifies them. The application reads the
 * whole table into memory, and changes it row by row.
 *
 * ```javascript
 * import {googleAccount} from 'ricochet/adapters/google.mjs'
 * import {DriveSheet} from 'ricochet/adapters/drive-sheet.mjs'
 *
 * const notes = new DriveSheet({
 *   account: googleAccount,                 // configured, with the scope drive.file
 *   path: ['My app', 'data', 'notes'],      // the folders, created when missing
 *   file: 'notes',                          // the spreadsheet
 *   tab: 'rows',
 *   columns: ['id', 'Label', 'Done'],       // the headers written by the application
 *   key: 'id'
 * })
 * let rows = await notes.load()             // the local copy: at once (null the first time)
 * rows = await notes.pull()                 // Drive (null: no spreadsheet yet)
 * if (rows === null) { rows = await notes.create([{id: 'a1', Label: 'First', Done: false}]) }
 * notes.put({id: 'a2', Label: 'Second', Done: true})
 * ```
 *
 * ## The spreadsheet
 *
 * The first row of the tab holds the headers. The rows are read with their raw values (numbers, booleans, text) and
 * written as they are (`RAW`: a date is the text written by the application). A header written by the user in the
 * spreadsheet is kept: its values come with the rows, and are written back. The columns keep the order of the tab (the
 * user may move them); a column of `columns` missing in the tab (deleted by hand) is added again at the end when the
 * tab is written; a column deleted from `columns` but still in the tab stays there. A row without key, added by hand, is kept at the end of the tab, and not given to the
 * application. The user may sort, edit or add rows in the spreadsheet: the rows are found again by their key.
 *
 * With the scope `drive.file`, the application sees only the folders and spreadsheets it created. The first folder
 * of the path is found by its name anywhere in that space (as the folder of `DriveConfigAdapter`), the others under
 * their parent.
 *
 * ## Reading
 *
 * - `load()` gives the local copy, at once, without Google: the rows of the last reading, with the changes made since.
 * - `pull()` reads the tab in Drive: its rows, with the changes made here and not yet sent, become the local copy.
 *   It gives `null` when the spreadsheet does not exist yet (`create()`). Without a connection, it fails (`GoogleError`
 *   or `Error`): the application keeps the local copy.
 * - `create(rows)` creates the folders, the spreadsheet with its tab and headers, and writes the rows.
 *
 * ## Changes
 *
 * `put(row)` (a new row, or a row replaced: same key) and `remove(key)` change the local copy at once, then the tab
 * a few seconds later (`uploadDelay`): the tab is read again, the rows changed here replace its rows, and the whole
 * tab is written in one request. A row changed in the spreadsheet and not here keeps the version of the spreadsheet;
 * the last change of a row wins. A failed sending is tried again 30 seconds later (`retryDelay`), and at the next
 * connection; the changes wait in the local copy, even when the page is closed.
 *
 * What waits is reported to `pendingWrites` (source `sheet <file>/<tab>` by default), as for `DriveConfigAdapter`.
 *
 * ## The local copy
 *
 * One record per table in IndexedDB (database `ricochet-sheets`): the rows, the headers, the identifier of the
 * spreadsheet and the changes that wait. Without IndexedDB (private window…), the copy stays in memory, for the page.
 * `forget()` erases it (the spreadsheet in Drive is kept).
 *
 * ## Limits
 *
 * A cell holds 50 000 characters at most: a longer text is refused by Google, and the sending fails. The whole tab
 * is written at each sending: the adapter suits tables of some hundreds of rows.
 *
 * @module drive-sheet
 * @category adapters
 * @listens googleConnected - The account is connected: the changes that wait are sent.
 */

import {bus} from '../core/bus.mjs'
import {pendingWrites} from '../core/pending.mjs'

const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets'
const FOLDER_TYPE = 'application/vnd.google-apps.folder'
const SHEET_TYPE = 'application/vnd.google-apps.spreadsheet'
const DATABASE = 'ricochet-sheets'
const STORE = 'tables'

// a name in a query of Drive
const quote = text => `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

// ---------------------------------------------------------------- the local copy

// the local copies of the tables, in IndexedDB; in memory when IndexedDB is not available
let opening = null
const memory = new Map()
let warned = false

const database = () => {
  if (opening === null) {
    opening = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DATABASE, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }
  return opening
}

const run = async (mode, action) => {
  if (globalThis.indexedDB === undefined) { throw new Error('no IndexedDB') }
  const opened = await database()
  return new Promise((resolve, reject) => {
    const transaction = opened.transaction(STORE, mode)
    const request = action(transaction.objectStore(STORE))
    transaction.oncomplete = () => resolve(request.result)
    transaction.onerror = () => reject(transaction.error)
  })
}

const fallback = error => {
  if (!warned) {
    warned = true
    console.warn('DriveSheet: IndexedDB is not available, the local copies stay in memory', error.message)
  }
}

const sheetCache = {
  async get (name) {
    try {
      return await run('readonly', store => store.get(name)) ?? memory.get(name) ?? null
    } catch (error) {
      fallback(error)
      return memory.get(name) ?? null
    }
  },
  async set (name, record) {
    try {
      await run('readwrite', store => store.put(record, name))
    } catch (error) {
      fallback(error)
      memory.set(name, record)
    }
  },
  async delete (name) {
    memory.delete(name)
    try { await run('readwrite', store => store.delete(name)) } catch (error) { fallback(error) }
  }
}

// ---------------------------------------------------------------- the table

/**
 * A table in a tab of a Google spreadsheet, with a local copy.
 */
export class DriveSheet {
  #account
  #path
  #file
  #tab
  #columns
  #key
  #name
  #local
  #registry
  #source
  #uploadDelay
  #retryDelay
  #record = null // the local copy: {rows, headers, extra, fileId, height, width, pending: {key: row|null}}
  #reading = null // the local copy being read (promise)
  #running = null // the sending in progress (promise), one at a time
  #again = null // another sending asked during one: {promise, resolve}
  #timer = null
  #failed = false
  #listening = false

  /**
   * @param {object} options
   * @param {object} options.account - The Google account (`googleAccount` of `adapters/google.mjs`, configured).
   * @param {string[]} options.path - The folders of the spreadsheet, from the first one: created when missing.
   * @param {string} options.file - The name of the spreadsheet.
   * @param {string} options.tab - The name of the tab.
   * @param {string[]} options.columns - The headers of the application, in order.
   * @param {string} options.key - The header of the column that identifies the rows (one of `columns`).
   * @param {string} [options.name] - The name of the local copy (default `<path>/<file>/<tab>`).
   * @param {string} [options.source] - The name of the source in `pendingWrites` (default `sheet <file>/<tab>`).
   * @param {number} [options.uploadDelay] - The delay before the changes are sent, in ms (default 2000).
   * @param {number} [options.retryDelay] - The delay before a failed sending is tried again, in ms (default 30000).
   * @param {object} [options.local] - Where the local copy is kept: `{get(name), set(name, record), delete(name)}`
   *   (default: IndexedDB); for the tests.
   * @param {object} [options.registry] - Where the changes that wait are reported (default `pendingWrites`).
   */
  constructor ({account, path, file, tab, columns, key, name, source, uploadDelay = 2000, retryDelay = 30000,
    local = sheetCache, registry = pendingWrites}) {
    if (!columns.includes(key)) { throw new Error(`DriveSheet: the key '${key}' is not a column`) }
    this.#account = account
    this.#path = [...path]
    this.#file = file
    this.#tab = tab
    this.#columns = [...columns]
    this.#key = key
    this.#name = name ?? [...path, file, tab].join('/')
    this.#source = source ?? `sheet ${file}/${tab}`
    this.#uploadDelay = uploadDelay
    this.#retryDelay = retryDelay
    this.#local = local
    this.#registry = registry
  }

  /** The rows in memory (after `load()`, `pull()` or `create()`), in the order of the tab; `null` before. */
  get rows () { return this.#record?.rows ?? null }

  /** The headers: the ones of the tab, in its order, then the columns of the application missing in it. */
  get headers () { return this.#record === null ? [...this.#columns] : [...this.#record.headers] }

  /** The keys of the rows changed here and not yet in Drive. */
  get pending () { return Object.keys(this.#record?.pending ?? {}) }

  /**
   * The local copy, without Google.
   * @returns {Promise<object[]|null>} The rows, or `null` when the table was never read on this browser.
   */
  async load () {
    this.#listen()
    const record = await this.#read()
    this.#report()
    if (record.fileId !== null && Object.keys(record.pending).length > 0 && this.#account.connected) { this.#later() }
    return record.fileId === null && record.rows.length === 0 ? null : record.rows
  }

  /**
   * Reads the tab in Drive: its rows, with the changes that wait, become the local copy.
   * @returns {Promise<object[]|null>} The rows, or `null` when the spreadsheet does not exist.
   */
  async pull () {
    this.#listen()
    const record = await this.#read()
    const fileId = record.fileId ?? await this.#findFile()
    if (fileId === null) { return null }
    const remote = await this.#readTab(fileId)
    if (remote === null) { // the spreadsheet was deleted
      record.fileId = null
      await this.#save()
      return null
    }
    record.fileId = fileId
    this.#take(remote)
    await this.#save()
    if (Object.keys(record.pending).length > 0) { this.#later() }
    return record.rows
  }

  /**
   * Creates the folders, the spreadsheet with its tab and its headers, and writes the rows.
   * @param {object[]} rows - The rows, each with its key.
   * @returns {Promise<object[]>} The rows.
   */
  async create (rows) {
    this.#listen()
    const record = await this.#read()
    let parent = null
    for (const folder of this.#path) { parent = await this.#folder(folder, parent) }
    const file = await this.#account.request(DRIVE, {
      method: 'POST', query: {fields: 'id'}, body: {name: this.#file, mimeType: SHEET_TYPE, parents: parent === null ? [] : [parent]}, source: 'drive'
    })
    // the first tab of a new spreadsheet: renamed, its first row frozen
    const {sheets = []} = await this.#account.request(`${SHEETS}/${file.id}`, {query: {fields: 'sheets.properties.sheetId'}, source: 'drive'}) ?? {}
    await this.#account.request(`${SHEETS}/${file.id}:batchUpdate`, {
      method: 'POST',
      body: {requests: [{updateSheetProperties: {
        properties: {sheetId: sheets[0]?.properties?.sheetId ?? 0, title: this.#tab, gridProperties: {frozenRowCount: 1}},
        fields: 'title,gridProperties.frozenRowCount'
      }}]},
      source: 'drive'
    })
    Object.assign(record, {fileId: file.id, headers: [...this.#columns], extra: [], height: 0, width: 0, pending: {}})
    record.rows = rows.map(row => this.#clean(row))
    await this.#writeTab(record)
    await this.#save()
    this.#report()
    return record.rows
  }

  /**
   * A new row, or a row replaced (same key): at once in the local copy, a few seconds later in Drive.
   * @param {object} row - The row, with its key.
   * @returns {Promise<void>} When the local copy is written.
   */
  async put (row) {
    const record = await this.#read()
    const clean = this.#clean(row)
    const key = clean[this.#key]
    if (key === '') { throw new Error('DriveSheet: a row without key') }
    const index = record.rows.findIndex(r => r[this.#key] === key)
    if (index === -1) {
      record.rows.push(clean)
    } else {
      // the columns added in the spreadsheet, unknown to the application, keep their values
      for (const header of record.headers) { if (!(header in clean)) { clean[header] = record.rows[index][header] ?? '' } }
      record.rows[index] = clean
    }
    record.pending[key] = clean
    await this.#changed()
  }

  /**
   * Deletes a row: at once in the local copy, a few seconds later in Drive.
   * @param {string} key - The key of the row.
   * @returns {Promise<void>} When the local copy is written.
   */
  async remove (key) {
    const record = await this.#read()
    record.rows = record.rows.filter(row => row[this.#key] !== key)
    record.pending[key] = null
    await this.#changed()
  }

  /**
   * Sends now the changes that wait. Without a connection, or before the spreadsheet is known (`pull()`,
   * `create()`), does nothing: they wait.
   * @returns {Promise<void>}
   */
  sync () {
    if (!this.#account.connected || this.#record === null || this.#record.fileId === null) {
      this.#report()
      return Promise.resolve()
    }
    if (this.#running !== null) {
      if (this.#again === null) {
        let resolve
        const promise = new Promise(done => { resolve = done })
        this.#again = {promise, resolve}
      }
      return this.#again.promise
    }
    clearTimeout(this.#timer)
    this.#timer = null
    this.#running = this.#send()
      .then(() => { this.#failed = false })
      .catch(error => {
        this.#failed = true
        console.warn(`DriveSheet: '${this.#name}' cannot be written in Drive, the changes wait`, error.message)
        this.#later(this.#retryDelay)
      })
      .finally(() => {
        this.#running = null
        this.#report()
        if (this.#again !== null) {
          const {resolve} = this.#again
          this.#again = null
          resolve(this.sync())
        }
      })
    this.#report()
    return this.#running
  }

  /**
   * Erases the local copy (the spreadsheet in Drive is kept), with the changes that wait.
   * @returns {Promise<void>}
   */
  async forget () {
    clearTimeout(this.#timer)
    this.#timer = null
    this.#record = this.#empty()
    this.#failed = false
    await this.#local.delete(this.#name)
    this.#report()
  }

  // ---------------------------------------------------------------- inside

  #empty () { return {rows: [], headers: [...this.#columns], extra: [], fileId: null, height: 0, width: 0, pending: {}} }

  #listen () {
    if (this.#listening) { return }
    this.#listening = true
    bus.on('googleConnected', () => this.sync())
    bus.on('googleExpired', () => this.#report())
    bus.on('googleDisconnected', () => this.#report())
  }

  // the local copy, read once
  #read () {
    if (this.#record !== null) { return Promise.resolve(this.#record) }
    if (this.#reading === null) {
      this.#reading = this.#local.get(this.#name).then(record => {
        this.#record = this.#record ?? {...this.#empty(), ...record}
        return this.#record
      })
    }
    return this.#reading
  }

  #save () { return this.#local.set(this.#name, structuredClone(this.#record)) }

  async #changed () {
    await this.#save()
    this.#report()
    this.#later()
  }

  #later (delay = this.#uploadDelay) {
    clearTimeout(this.#timer)
    this.#timer = setTimeout(() => {
      this.#timer = null
      this.sync()
    }, delay)
    this.#timer?.unref?.() // Node: does not keep the tests running
  }

  #report () {
    const state = this.#account.state ?? (this.#account.connected ? 'connected' : 'signed-out')
    this.#registry.report(this.#source, {
      count: Object.keys(this.#record?.pending ?? {}).length,
      state: this.#running !== null ? 'saving' : this.#failed ? 'error' : state !== 'connected' ? 'offline' : 'queued',
      saved: false
    })
  }

  // a row with the values of the columns only: '' for the missing ones, the key as text
  #clean (row) {
    const clean = {}
    for (const column of this.#columns) { clean[column] = row[column] ?? '' }
    for (const header of this.#record?.headers ?? []) { if (!(header in clean) && header in row) { clean[header] = row[header] } }
    clean[this.#key] = `${clean[this.#key]}`
    return clean
  }

  // the rows of the tab, with the changes that wait, become the local copy
  #take (remote) {
    const record = this.#record
    const {pending} = record
    // the rows of the tab, in its order: the ones changed here replaced (their columns added by hand kept), the ones
    // deleted here left out; then the new rows of this browser
    const rows = remote.rows.filter(row => pending[row[this.#key]] !== null)
      .map(row => pending[row[this.#key]] === undefined ? row : {...row, ...pending[row[this.#key]]})
    const known = new Set(remote.rows.map(row => row[this.#key]))
    for (const [key, row] of Object.entries(pending)) { if (row !== null && !known.has(key)) { rows.push(row) } }
    Object.assign(record, {rows, headers: remote.headers, extra: remote.extra, height: remote.height, width: remote.width})
  }

  // sends the changes that wait: the tab read again, merged, written
  async #send () {
    const record = this.#record
    const pending = {...record.pending}
    if (Object.keys(pending).length === 0) { return }
    const remote = await this.#readTab(record.fileId)
    if (remote === null) { throw new Error('the spreadsheet does not exist any more') }
    this.#take(remote)
    await this.#writeTab(record)
    // the rows sent are no longer pending, unless they changed again meanwhile
    for (const [key, row] of Object.entries(pending)) { if (record.pending[key] === row) { delete record.pending[key] } }
    await this.#save()
    this.#registry.report(this.#source, {count: Object.keys(record.pending).length, state: 'saving', saved: true})
  }

  // the tab: {rows, headers, extra (rows without key, as arrays), height, width}; null when the spreadsheet is gone
  async #readTab (fileId) {
    let answer
    try {
      answer = await this.#account.request(`${SHEETS}/${fileId}/values/${encodeURIComponent(quote(this.#tab))}`, {
        query: {valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING'}, source: 'drive'
      })
    } catch (error) {
      if (error.status === 404) { return null }
      if (error.status === 400 && /range/i.test(error.message)) { // the tab was renamed or deleted: added again
        await this.#account.request(`${SHEETS}/${fileId}:batchUpdate`, {
          method: 'POST', body: {requests: [{addSheet: {properties: {title: this.#tab, gridProperties: {frozenRowCount: 1}}}}]}, source: 'drive'
        })
        return {rows: [], headers: [...this.#columns], extra: [], height: 0, width: 0}
      }
      throw error
    }
    const values = answer?.values ?? []
    const written = (values[0] ?? []).map(header => `${header}`.trim())
    const known = written.filter((header, index) => header !== '' && written.indexOf(header) === index)
    const headers = [...known, ...this.#columns.filter(column => !known.includes(column))]
    const rows = []
    const extra = []
    for (const line of values.slice(1)) {
      const row = {}
      written.forEach((header, index) => { if (header !== '') { row[header] = line[index] ?? '' } })
      for (const header of headers) { row[header] = row[header] ?? '' }
      const key = `${row[this.#key]}`
      if (key === '') {
        if (line.some(value => value !== '' && value !== null)) { extra.push(row) }
        continue
      }
      row[this.#key] = key
      rows.push(row)
    }
    return {rows, headers, extra, height: values.length, width: written.length}
  }

  // the whole tab, in one request: the cells beyond the new size are emptied
  async #writeTab (record) {
    const {headers} = record
    const lines = [headers, ...[...record.rows, ...record.extra].map(row => headers.map(header => row[header] ?? ''))]
    const width = Math.max(headers.length, record.width)
    const height = Math.max(lines.length, record.height)
    const values = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => lines[y]?.[x] ?? ''))
    await this.#account.request(`${SHEETS}/${record.fileId}/values/${encodeURIComponent(quote(this.#tab))}`, {
      method: 'PUT', query: {valueInputOption: 'RAW'}, body: {majorDimension: 'ROWS', values}, source: 'drive'
    })
    record.height = lines.length
    record.width = headers.length
  }

  // the spreadsheet, in its folders, or null
  async #findFile () {
    let parent = null
    for (const folder of this.#path) {
      parent = await this.#folder(folder, parent, false)
      if (parent === null) { return null }
    }
    const {files = []} = await this.#account.request(DRIVE, {
      query: {q: `name = ${quote(this.#file)} and mimeType = '${SHEET_TYPE}' and ${parent === null ? "'root'" : quote(parent)} in parents and trashed = false`,
        fields: 'files(id)', spaces: 'drive'},
      source: 'drive'
    }) ?? {}
    return files[0]?.id ?? null
  }

  // a folder under its parent (the first one: anywhere), created when missing (unless create is false: null)
  async #folder (name, parent, create = true) {
    const where = parent === null ? '' : ` and ${quote(parent)} in parents`
    const {files = []} = await this.#account.request(DRIVE, {
      query: {q: `name = ${quote(name)} and mimeType = '${FOLDER_TYPE}'${where} and trashed = false`, fields: 'files(id)', spaces: 'drive'},
      source: 'drive'
    }) ?? {}
    if (files.length > 0) { return files[0].id }
    if (!create) { return null }
    const folder = await this.#account.request(DRIVE, {
      method: 'POST', query: {fields: 'id'}, body: {name, mimeType: FOLDER_TYPE, parents: parent === null ? [] : [parent]}, source: 'drive'
    })
    return folder.id
  }
}
