// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-storage.mjs — the IndexedDB storage adapter, with the real database of the browser

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
