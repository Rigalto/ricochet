// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-storage.mjs — the IndexedDB storage adapter and the local copy of DriveSheet, with the real database of the browser

import {describe, assert} from '../kernel.mjs'
import {IndexedDBAdapter} from '../../src/adapters/indexeddb.mjs'
import {ConfigStore} from '../../src/core/config.mjs'

const NAME = 'ricochet-test-storage'
const OTHER = 'ricochet-test-storage-other'
const drop = name => new Promise(resolve => {
  const request = indexedDB.deleteDatabase(name)
  request.onsuccess = request.onerror = request.onblocked = () => resolve()
})

await describe('IndexedDBAdapter', async () => {
  await drop(NAME)
  await drop(OTHER)
  const first = new IndexedDBAdapter(NAME, {theme: 'day', size: 'm'})
  assert('the defaults at first, nothing stored', JSON.stringify(await first.load()) === '{"theme":"day","size":"m"}' &&
    !first.inMemory)
  await first.save([{item: 'theme', value: 'night'}, {item: 'zoom', value: '2'}])
  await first.remove(['size'])
  await first.close()
  // a new adapter, as after a reload of the page
  const second = new IndexedDBAdapter(NAME, {theme: 'day', size: 'm'})
  const loaded = await second.load()
  assert('the saved items survive, over the defaults', loaded.theme === 'night' && loaded.zoom === '2' && loaded.size === 'm')
  await second.save([{item: 'size', value: 'l'}])
  await second.remove(['zoom'])
  const again = await second.load()
  assert('a removed item is gone, a default can be overwritten', again.zoom === undefined && again.size === 'l')
  const other = new IndexedDBAdapter(OTHER)
  assert('another name, another database', JSON.stringify(await other.load()) === '{}')
  // as the adapter of a store: a change is saved, then found again
  const store = new ConfigStore({saveDelay: 10})
  store.setAdapter(new IndexedDBAdapter(OTHER, {a: '1'}))
  await store.load()
  store.setItem('a', '2')
  await store.save()
  const reloaded = new IndexedDBAdapter(OTHER)
  assert('works as the adapter of the store', store.get('a') === '2' && (await reloaded.load()).a === '2')
  await Promise.all([second.close(), other.close(), reloaded.close()])
  await drop(NAME)
  await drop(OTHER)
})

await describe('secrets', async () => {
  const {secrets} = await import('../../src/core/secrets.mjs')
  const {bus} = await import('../../src/core/bus.mjs')
  const seen = []
  const listener = payload => seen.push(payload.name)
  bus.on('secretChanged', listener)
  secrets.remove('test-key')
  secrets.set('test-key', ' k-123 ')
  assert('kept in localStorage', !secrets.inMemory && localStorage.getItem('ricochet-secret-test-key') === 'k-123' &&
    secrets.get('test-key') === 'k-123')
  // another document of the same origin (another tab) changes it
  const frame = document.createElement('iframe')
  document.body.append(frame)
  seen.length = 0
  frame.contentWindow.localStorage.setItem('ricochet-secret-test-key', 'from-elsewhere')
  frame.contentWindow.localStorage.setItem('not-a-secret', 'x')
  await new Promise(resolve => setTimeout(resolve, 50))
  assert('a change in another tab: secretChanged', JSON.stringify(seen) === '["test-key"]' &&
    secrets.get('test-key') === 'from-elsewhere')
  frame.remove()
  localStorage.removeItem('not-a-secret')
  secrets.remove('test-key')
  bus.off('secretChanged', listener)
  assert('removed', localStorage.getItem('ricochet-secret-test-key') === null)
})

await describe('session', async () => {
  const {session} = await import('../../src/core/session.mjs')
  session.remove('test-history')
  session.set('test-history', [{path: '#a'}, {path: '#b'}])
  assert('kept in sessionStorage, as JSON', !session.inMemory &&
    sessionStorage.getItem('ricochet-session-test-history') === '[{"path":"#a"},{"path":"#b"}]' &&
    session.get('test-history')[1].path === '#b')
  session.remove('test-history')
  assert('removed', sessionStorage.getItem('ricochet-session-test-history') === null && session.get('test-history', 0) === 0)
})

await describe('openAppDatabase — the stores of an application', async () => {
  const {openAppDatabase} = await import('../../src/adapters/indexeddb.mjs')
  const remove = name => new Promise(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = request.onerror = request.onblocked = resolve })
  await remove('ricochet-test-stores')
  let db = await openAppDatabase('ricochet-test-stores', ['a', 'b'])
  assert('a new database, with its stores', db.version === 1 && [...db.objectStoreNames].join() === 'a,b')
  db.close()
  db = await openAppDatabase('ricochet-test-stores', ['a'])
  assert('stores already there: the same version', db.version === 1)
  db.close()
  db = await openAppDatabase('ricochet-test-stores', ['c'])
  assert('a missing store: the next version, the others kept', db.version === 2 && [...db.objectStoreNames].join() === 'a,b,c')
  db.close()
  // two parts of the page add their stores at the same time
  const [x, y] = await Promise.all([openAppDatabase('ricochet-test-stores', ['d']), openAppDatabase('ricochet-test-stores', ['e'])])
  x.onversionchange = () => x.close()
  y.onversionchange = () => y.close()
  db = await openAppDatabase('ricochet-test-stores', ['a'])
  assert('two stores added at the same time: both there', [...db.objectStoreNames].join() === 'a,b,c,d,e')
  db.close()
  x.close()
  y.close()
  await remove('ricochet-test-stores')
})

await describe('DriveSheet — the local copy in the database of the application', async () => {
  const {DriveSheet} = await import('../../src/adapters/drive-sheet.mjs')
  const {PendingWrites} = await import('../../src/core/pending.mjs')
  const remove = name => new Promise(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = request.onerror = request.onblocked = resolve })
  await remove('ricochet-test-app')
  // the items of the application, before its tables
  const items = new IndexedDBAdapter('ricochet-test-app')
  await items.save([{item: 'colour', value: 'blue'}])
  // a spreadsheet that exists, with two rows; offline afterwards
  const account = {
    connected: true,
    request: async (url, {method = 'GET'} = {}) => {
      if (url.includes('/drive/v3/files/')) { return {trashed: false} }
      if (url.includes('/drive/v3/files')) { return {files: [{id: 'x1'}]} }
      if (method === 'GET') { return {values: [['id', 'Label'], ['a1', 'One'], ['a2', 'Two']]} }
      return {}
    }
  }
  const options = {account, path: ['App'], file: 'test', tab: 'rows', columns: ['id', 'Label'], key: 'id', name: 'notes',
    database: 'ricochet-test-app', registry: new PendingWrites(), uploadDelay: 60000}
  const first = new DriveSheet(options)
  assert('nothing yet on this browser', await first.load() === null)
  await first.pull()
  const stores = await new Promise(resolve => { const r = indexedDB.open('ricochet-test-app'); r.onsuccess = () => { resolve([...r.result.objectStoreNames].join() + ' v' + r.result.version); r.result.close() } })
  assert('the store of the tables added to the database of the application, next to its items', stores === 'items,tables v2')
  assert('… the items kept, and the adapter of the items still working', (await items.load()).colour === 'blue' &&
    await items.save([{item: 'size', value: '3'}]) === undefined && (await items.load()).size === '3')
  account.connected = false
  await first.put({id: 'a3', Label: 'Three'})
  const second = new DriveSheet(options)
  const rows = await second.load()
  assert('another page: the rows and the change that waits, from IndexedDB', rows?.map(r => r.Label).join() === 'One,Two,Three' && second.pending.join() === 'a3')
  await DriveSheet.forgetAll('ricochet-test-app')
  assert('forgetAll: the tables of the page emptied', first.rows.length === 0 && second.rows.length === 0 && second.pending.length === 0)
  const third = new DriveSheet(options)
  assert('… and the database: nothing more on this browser', await third.load() === null)
  assert('… the items kept', (await items.load()).colour === 'blue')
  await items.close()
  await remove('ricochet-test-app')
})
