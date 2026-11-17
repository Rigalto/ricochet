// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-drive-sheet.mjs — node tests/run.mjs DriveSheet
// A table in a Google spreadsheet (adapters/drive-sheet.mjs), with a fake Drive and Sheets, a fake account and a local
// copy in memory: the creation of the folders and of the spreadsheet, the reading, the local copy, the changes merged
// with the spreadsheet, the columns and rows added by hand, the wait without connection, forget().

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {DriveSheet} from '../src/adapters/drive-sheet.mjs'
import {PendingWrites} from '../src/core/pending.mjs'

// Drive (folders, spreadsheets) and Sheets (one tab per spreadsheet is enough here, found by its title)
class FakeGoogle {
  files = new Map() // id → {name, mimeType, parents, tabs: {title: values}}
  calls = []
  #next = 1
  async request (url, {method = 'GET', query = {}, body} = {}) {
    const path = url.replace(/^https:\/\/[^/]+/, '')
    this.calls.push(`${method} ${path}`)
    if (path === '/drive/v3/files' && method === 'GET') {
      const q = query.q
      const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)[1].replaceAll("\\'", "'")
      const type = /mimeType = '([^']+)'/.exec(q)[1]
      const parent = /'([^']+)' in parents/.exec(q)?.[1]
      const files = [...this.files].filter(([, f]) => f.name === name && f.mimeType === type && !f.trashed &&
        (parent === undefined || (parent === 'root' ? f.parents.length === 0 : f.parents.includes(parent))))
      return {files: files.map(([id]) => ({id}))}
    }
    const meta = /^\/drive\/v3\/files\/([^/]+)$/.exec(path)
    if (meta !== null && method === 'GET') {
      const file = this.files.get(meta[1])
      if (file === undefined || file.deleted) { throw Object.assign(new Error('File not found'), {status: 404}) }
      return {trashed: file.trashed === true}
    }
    if (path === '/drive/v3/files' && method === 'POST') {
      const id = `${body.mimeType.endsWith('folder') ? 'd' : 's'}${this.#next++}`
      this.files.set(id, {...body, tabs: body.mimeType.endsWith('folder') ? undefined : {'Feuille 1': []}})
      return {id}
    }
    const sheet = /^\/v4\/spreadsheets\/([^/:]+)(.*)$/.exec(path)
    const file = this.files.get(sheet?.[1])
    // as Google: a spreadsheet in the trash can still be read and written through its identifier
    if (file === undefined || file.deleted) { throw Object.assign(new Error('Requested entity was not found.'), {status: 404}) }
    const rest = sheet[2]
    if (rest === '' && method === 'GET') {
      return {sheets: Object.keys(file.tabs).map((title, index) => ({properties: {sheetId: index * 7}}))}
    }
    if (rest === ':batchUpdate') {
      for (const request of body.requests) {
        if (request.updateSheetProperties) {
          const [old] = Object.keys(file.tabs)
          file.tabs = {[request.updateSheetProperties.properties.title]: file.tabs[old]}
          file.frozen = request.updateSheetProperties.properties.gridProperties.frozenRowCount
        }
        if (request.addSheet) { file.tabs[request.addSheet.properties.title] = [] }
      }
      return {}
    }
    const range = decodeURIComponent(rest.replace('/values/', '')).replace(/^'(.*)'$/, '$1').replaceAll("\\'", "'")
    if (!(range in file.tabs)) { throw Object.assign(new Error(`Unable to parse range: ${range}`), {status: 400}) }
    if (method === 'GET') {
      this.lastRender = query.valueRenderOption
      const values = file.tabs[range].map(line => { // Sheets drops the empty cells at the end of the lines and the empty lines
        const copy = [...line]
        while (copy.length > 0 && copy.at(-1) === '') { copy.pop() }
        return copy
      })
      while (values.length > 0 && values.at(-1).length === 0) { values.pop() }
      return values.length === 0 ? {range} : {range, values}
    }
    if (method === 'PUT') {
      this.lastInput = query.valueInputOption
      const tab = file.tabs[range]
      body.values.forEach((line, y) => {
        tab[y] = tab[y] ?? []
        line.forEach((value, x) => { tab[y][x] = value })
      })
      return {}
    }
    throw new Error(`unexpected ${method} ${path}`)
  }

  tab (name = 'fiches') { return [...this.files.values()].find(f => f.tabs?.[name] && !f.trashed && !f.deleted)?.tabs[name] }
}

class MemoryCache {
  map = new Map()
  async get (name) { return structuredClone(this.map.get(name) ?? null) }
  async set (name, record) { this.map.set(name, structuredClone(record)) }
  async delete (name) { this.map.delete(name) }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const COLUMNS = ['id', 'Étiquette', 'Titre', 'Avancement', 'Mots']
const make = ({google, connected = true, local = new MemoryCache(), retryDelay = 30000, columns = COLUMNS}) => {
  const registry = new PendingWrites()
  const account = {connected, request: (url, options) => google.request(url, options)}
  const sheet = new DriveSheet({account, path: ['SweetHome', 'data', "l'univers"], file: 'prg-not', tab: 'fiches', columns, key: 'id',
    uploadDelay: 20, retryDelay, local, registry})
  return {sheet, account, registry, local}
}
const ROWS = [
  {id: 'a1', Étiquette: 'Un', Titre: 'Premier', Avancement: true, Mots: 12},
  {id: 'a2', Étiquette: 'Deux', Titre: '', Avancement: false, Mots: 0}
]

await describe('DriveSheet — creation and reading', async () => {
  const google = new FakeGoogle()
  const {sheet, local} = make({google})
  assert('no local copy: null', await sheet.load() === null && sheet.rows.length === 0)
  assert('no spreadsheet in Drive: null, nothing created', await sheet.pull() === null && google.files.size === 0)
  const rows = await sheet.create(ROWS)
  const folders = [...google.files.values()].filter(f => f.mimeType.endsWith('folder'))
  const data = folders.find(f => f.name === 'data')
  const top = folders.find(f => f.name === 'SweetHome')
  const universe = folders.find(f => f.name === "l'univers")
  const file = [...google.files.values()].find(f => f.name === 'prg-not')
  assert('the folders created, each in its parent', folders.length === 3 && top.parents.length === 0 &&
    data.parents[0] === [...google.files].find(([, f]) => f === top)[0] && universe.parents[0] === [...google.files].find(([, f]) => f === data)[0])
  assert('the spreadsheet in the last folder, its tab renamed, the headers frozen', file.mimeType === 'application/vnd.google-apps.spreadsheet' &&
    file.parents[0] === [...google.files].find(([, f]) => f === universe)[0] && Object.keys(file.tabs).join() === 'fiches' && file.frozen === 1)
  assert('the headers, then the rows, raw values', JSON.stringify(google.tab()) === JSON.stringify([COLUMNS, ['a1', 'Un', 'Premier', true, 12], ['a2', 'Deux', '', false, 0]]) &&
    google.lastInput === 'RAW')
  assert('create: the rows in memory', rows.length === 2 && sheet.rows[0].Titre === 'Premier')
  assert('… and in the local copy', local.map.get("SweetHome/data/l'univers/prg-not/fiches").rows.length === 2)

  // another browser: reads the spreadsheet, through its folders
  const other = make({google})
  google.calls.length = 0
  const read = await other.sheet.pull()
  assert('another browser finds the spreadsheet through the folders, reads the raw values', read.length === 2 && read[0].Avancement === true &&
    read[1].Mots === 0 && read[0].id === 'a1' && google.lastRender === 'UNFORMATTED_VALUE')
  assert('… four searches and one reading', google.calls.filter(c => c.startsWith('GET /drive')).length === 4 && google.calls.length === 5)
  google.calls.length = 0
  await other.sheet.pull()
  assert('the spreadsheet known: checked, then read', google.calls.length === 2 && google.calls[0].startsWith('GET /drive/v3/files/'))
  const again = make({google, local: other.local})
  assert('the local copy, at once, without Google', (await again.sheet.load()).length === 2 && google.calls.length === 2)
})

await describe('DriveSheet — changes', async () => {
  const google = new FakeGoogle()
  const {sheet, registry} = make({google})
  await sheet.load()
  await sheet.create(ROWS)
  let reports = []
  registry.report = (source, report) => reports.push({source, ...report})
  await sheet.put({id: 'a3', Étiquette: 'Trois', Titre: 'Nouveau', Avancement: false})
  await sheet.put({id: 'a1', Étiquette: 'Un', Titre: 'Premier, revu', Avancement: true, Mots: 14})
  await sheet.remove('a2')
  assert('at once in memory', sheet.rows.map(r => r.id).join() === 'a1,a3' && sheet.rows[0].Titre === 'Premier, revu' && sheet.rows[1].Mots === '')
  assert('… pending, reported', sheet.pending.join() === 'a3,a1,a2' && reports.at(-1).count === 3 && reports.at(-1).source === 'sheet prg-not/fiches')
  assert('… not yet in Drive', google.tab().length === 3 && google.tab()[1][2] === 'Premier')
  // meanwhile, the user edits the spreadsheet: a title, a column, a row without key
  google.tab()[0][5] = 'Note'
  google.tab()[1][5] = 'à voir'
  google.tab()[2][2] = 'Titre changé à la main'
  google.tab()[3] = ['', 'sans clé', '', '', '', '']
  reports = []
  await sleep(60)
  assert('sent after the delay: no longer pending', sheet.pending.length === 0 && reports.some(r => r.saved) && reports.at(-1).count === 0)
  const tab = google.tab()
  assert('the tab written: the headers of the user kept', tab[0].join() === 'id,Étiquette,Titre,Avancement,Mots,Note')
  assert('… a1 replaced, its cell of the user kept', tab[1].join() === 'a1,Un,Premier\\, revu,true,14,à voir'.replace('\\', ''))
  assert('… a2 deleted, a3 added, the row without key at the end', tab[2][0] === 'a3' && tab[3][1] === 'sans clé' && tab.length === 4)
  assert('the rows in memory: the column of the user, without the row without key', sheet.rows.length === 2 && sheet.rows[0].Note === 'à voir' &&
    sheet.headers.at(-1) === 'Note')
  // a row changed in the spreadsheet and not here: kept
  google.tab()[2][2] = 'Changé ailleurs'
  await sheet.put({...sheet.rows[0], Mots: 20})
  await sleep(60)
  assert('a row changed only in the spreadsheet keeps its version', google.tab()[2][2] === 'Changé ailleurs' && google.tab()[1][4] === 20)
  assert('… and comes into memory', sheet.rows[1].Titre === 'Changé ailleurs')
  // a shorter tab: the cells beyond are emptied
  await sheet.remove('a3')
  await sleep(60)
  assert('a deleted row: the cells beyond the new size emptied', google.tab()[2].every(v => v === '') || google.tab()[2][1] === 'sans clé')
})

await describe('DriveSheet — pull with changes that wait, columns', async () => {
  const google = new FakeGoogle()
  const {sheet} = make({google, connected: true})
  await sheet.create(ROWS)
  // a second browser, offline: its changes wait
  const offline = make({google, connected: false})
  await offline.sheet.load()
  assert('offline: no spreadsheet known, the changes cannot be sent', await offline.sheet.sync() === undefined)
  offline.account.connected = true
  await offline.sheet.pull()
  offline.account.connected = false
  await offline.sheet.put({id: 'a2', Étiquette: 'Deux', Titre: 'hors ligne', Avancement: true})
  await sleep(60)
  assert('without connection the change waits', offline.sheet.pending.join() === 'a2' && google.tab()[2][2] === '')
  google.tab()[1][2] = 'changé en ligne'
  offline.account.connected = true
  const rows = await offline.sheet.pull()
  assert('pull: the rows of the tab with the change that waits', rows[0].Titre === 'changé en ligne' && rows[1].Titre === 'hors ligne')
  await sleep(60)
  assert('… then sent', offline.sheet.pending.length === 0 && google.tab()[2][2] === 'hors ligne' && google.tab()[1][2] === 'changé en ligne')
  // a column of the application deleted by hand: added again at the end
  for (const line of google.tab()) { line.splice(3, 1) }
  const fresh = await sheet.pull()
  assert('a column deleted by hand: empty in the rows', fresh[0].Avancement === '' && sheet.headers.join() === 'id,Étiquette,Titre,Mots,Avancement')
  await sheet.put({...fresh[0], Avancement: true})
  await sleep(60)
  assert('… written again, at the end', google.tab()[0].join() === 'id,Étiquette,Titre,Mots,Avancement' && google.tab()[1][4] === true)
  // a column removed from the definition: kept in the tab
  const fewer = make({google, columns: ['id', 'Étiquette']})
  await fewer.sheet.pull()
  await fewer.sheet.put({id: 'a1', Étiquette: 'Un !'})
  const kept = fewer.sheet.rows
  await sleep(60)
  assert('a column no longer known by the application: kept', kept[0].Titre === 'changé en ligne' && google.tab()[1][2] === 'changé en ligne' &&
    google.tab()[1][1] === 'Un !')
})

await describe('DriveSheet — deleted spreadsheet, renamed tab, failures, forget', async () => {
  const google = new FakeGoogle()
  const {sheet, local, account} = make({google, retryDelay: 40})
  await sheet.create(ROWS)
  const [id] = [...google.files].find(([, f]) => f.name === 'prg-not')
  google.files.get(id).tabs = {Autre: []}
  const rows = await sheet.pull()
  assert('a renamed tab: added again, empty; the rows of this browser are only the ones that wait', rows.length === 0 && 'fiches' in google.files.get(id).tabs)
  google.files.get(id).trashed = true
  assert('the spreadsheet in the trash (still readable): null, forgotten', await sheet.pull() === null &&
    local.map.get("SweetHome/data/l'univers/prg-not/fiches").fileId === null)
  const rows2 = await sheet.create(ROWS)
  const [id2] = [...google.files].filter(([, f]) => f.name === 'prg-not' && !f.trashed).map(([key]) => key)
  assert('… create(): a new spreadsheet', rows2.length === 2 && id2 !== id && google.files.size === 5)
  google.files.get(id2).deleted = true
  assert('the spreadsheet deleted for good: null', await sheet.pull() === null)
  // a change waiting while the spreadsheet goes to the trash: not written there, it waits
  const third = make({google, retryDelay: 60000})
  await third.sheet.create(ROWS)
  const [id3] = [...google.files].filter(([, f]) => f.name === 'prg-not' && !f.trashed && !f.deleted).map(([key]) => key)
  google.files.get(id3).trashed = true
  captureConsole()
  await third.sheet.put({id: 'a7', Étiquette: 'Sept'})
  await sleep(60)
  const trashLines = releaseConsole()
  assert('a change while the spreadsheet is in the trash: not written, it waits', third.sheet.pending.join() === 'a7' &&
    !google.files.get(id3).tabs.fiches.some(line => line[0] === 'a7') && trashLines.some(l => l.includes('in the trash')))
  const second = make({google, retryDelay: 40})
  await second.sheet.create(ROWS)
  const realRequest = account.request
  let fail = true
  second.account.request = (url, options) => fail && options?.method === 'PUT' ? Promise.reject(new Error('offline')) : realRequest(url, options)
  captureConsole()
  await second.sheet.put({id: 'a9', Étiquette: 'Neuf'})
  await sleep(40)
  const lines = releaseConsole()
  assert('a failed sending: reported, the change waits', lines.some(l => l.includes('cannot be written')) && second.sheet.pending.join() === 'a9')
  fail = false
  await sleep(80)
  assert('… tried again later', second.sheet.pending.length === 0 && google.tab().some(line => line[0] === 'a9'))
  await second.sheet.forget()
  assert('forget: the local copy erased, the spreadsheet kept', second.local.map.size === 0 && second.sheet.rows.length === 0 &&
    google.tab().some(line => line[0] === 'a9'))
  let error = null
  try { make({google, columns: ['Étiquette']}) } catch (e) { error = e }
  assert('a key that is not a column: refused', error?.message.includes("the key 'id'"))
})
