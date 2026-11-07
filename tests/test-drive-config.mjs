// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-drive-config.mjs — node tests/run.mjs DriveConfig
// The adapter of the configuration items in Google Drive (adapters/drive-config.mjs), with a fake Drive, a fake
// account and a memory adapter as local copy: the seed, the start without Google, the first copy into Drive, the
// changes taken back at the start, the changes merged in Drive, the wait without connection, forget().

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {DriveConfigAdapter} from '../src/adapters/drive-config.mjs'
import {ConfigStore} from '../src/core/config.mjs'
import {MemoryAdapter} from '../src/adapters/memory.mjs'
import {bus} from '../src/core/bus.mjs'
import '../src/core/loop.mjs'

class FakeStorage {
  #map = new Map()
  getItem (key) { return this.#map.get(key) ?? null }
  setItem (key, value) { this.#map.set(key, String(value)) }
  removeItem (key) { this.#map.delete(key) }
}

// a Drive in memory: folders and files, found by name or by property
class FakeDrive {
  files = new Map() // id → {name, mimeType, parents, appProperties, content}
  calls = []
  #next = 1
  async request (url, {method = 'GET', query = {}, body} = {}) {
    this.calls.push(`${method} ${url.replace(/^https:\/\/www\.googleapis\.com/, '')}`)
    const id = url.split('/files')[1]?.replace('/', '') ?? ''
    if (method === 'GET' && id === '') {
      const q = query.q
      const property = /value='([^']+)'/.exec(q)
      const name = /name = '([^']+)'/.exec(q)
      const files = [...this.files].filter(([, f]) => property
        ? f.appProperties?.ricochetConfig === property[1]
        : f.name === name?.[1] && f.mimeType === 'application/vnd.google-apps.folder').map(([fileId]) => ({id: fileId}))
      return {files}
    }
    if (method === 'GET') {
      if (!this.files.has(id)) { throw Object.assign(new Error('File not found'), {status: 404}) }
      return JSON.parse(this.files.get(id).content)
    }
    if (method === 'POST' && url.includes('/upload/')) {
      const metadata = JSON.parse(await body.get('metadata').text())
      const content = await body.get('file').text()
      const fileId = `f${this.#next++}`
      this.files.set(fileId, {...metadata, content})
      return {id: fileId}
    }
    if (method === 'POST') {
      const fileId = `d${this.#next++}`
      this.files.set(fileId, {...body})
      return {id: fileId}
    }
    if (method === 'PATCH') {
      this.files.get(id).content = body
      return {}
    }
    throw new Error(`unexpected ${method} ${url}`)
  }
}

const account = (drive, connected = true) => ({connected, request: (url, options) => drive.request(url, options)})
const contentOf = drive => JSON.parse([...drive.files.values()].find(f => f.name === 'configuration.json').content)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let count = 0
const make = ({drive, connected = true, storage = new FakeStorage(), local = new MemoryAdapter({theme: 'system'}), seed = null}) => {
  const store = new ConfigStore({name: `drive${++count}`})
  const adapter = new DriveConfigAdapter({name: 'app', local, account: account(drive, connected), folder: 'App', seed, uploadDelay: 20, storage, store})
  store.setAdapter(adapter)
  return {store, adapter, local, storage}
}

await describe('DriveConfig — the first start, without Google', async () => {
  const drive = new FakeDrive()
  const {store, adapter} = make({drive, connected: false, seed: async () => ({modules: 'yes', theme: 'night'})})
  await store.load()
  assert('the seed is read once, over the defaults', store.get('modules') === 'yes' && store.get('theme') === 'night')
  store.setItem('theme', 'day')
  await store.save()
  await sleep(40)
  assert('not connected: written locally, waiting for Drive', adapter.pending.join() === 'theme' && drive.calls.length === 0)
})

await describe('DriveConfig — the first connection: the local items go into Drive', async () => {
  const drive = new FakeDrive()
  const storage = new FakeStorage()
  const local = new MemoryAdapter({theme: 'system'})
  const first = make({drive, connected: false, storage, local, seed: async () => ({modules: 'yes'})})
  await first.store.load()
  first.store.setItem('theme', 'day')
  await first.store.save()
  // the user signs in: the adapter hears googleConnected
  const second = make({drive, storage, local, seed: async () => ({modules: 'no'})})
  await second.store.load()
  await second.adapter.sync()
  const folder = [...drive.files.values()].find(f => f.mimeType === 'application/vnd.google-apps.folder')
  const content = contentOf(drive)
  assert('the folder, then the file with the local items', folder?.name === 'App' && content.theme === 'day' && content.modules === 'yes')
  assert('the seed is not read again', second.store.get('modules') === 'yes')
  assert('nothing waits any more', second.adapter.pending.length === 0)
})

await describe('DriveConfig — a start with a file in Drive', async () => {
  const drive = new FakeDrive()
  const storage = new FakeStorage()
  const local = new MemoryAdapter({theme: 'system'})
  const a = make({drive, storage, local})
  await a.store.load()
  await a.adapter.sync()
  // another computer changed the file
  const file = [...drive.files.values()].find(f => f.name === 'configuration.json')
  file.content = JSON.stringify({theme: 'night', modules: 'yes'})
  const b = make({drive, storage, local})
  let refreshed = 0
  const listener = () => { refreshed++ }
  bus.on('configRefreshed', listener)
  await b.store.load()
  assert('the start is local: the former value at once', b.store.get('theme') === 'system')
  await b.adapter.sync()
  bus.off('configRefreshed', listener)
  assert('then the changes of Drive come in, the store is loaded again', b.store.get('theme') === 'night' && b.store.get('modules') === 'yes' &&
    refreshed === 1 && b.adapter.pulled)
  // a change here, and a change of another tab in Drive
  b.store.setItem('theme', 'day')
  await b.store.save()
  file.content = JSON.stringify({theme: 'night', modules: 'yes', zoom: '2'})
  await sleep(60)
  const merged = contentOf(drive)
  assert('a change goes into Drive a few moments later, merged with the file', merged.theme === 'day' && merged.zoom === '2' &&
    merged.modules === 'yes' && b.adapter.pending.length === 0)
  assert('the changes of the other tab are not taken back after the start', b.store.get('zoom') === undefined)
  await b.store.remove('modules')
  await sleep(60)
  assert('a removed item leaves the file', contentOf(drive).modules === undefined)
})

await describe('DriveConfig — the file deleted in Drive, forget()', async () => {
  const drive = new FakeDrive()
  const storage = new FakeStorage()
  const local = new MemoryAdapter({theme: 'system'})
  const a = make({drive, storage, local})
  await a.store.load()
  a.store.setItem('theme', 'day')
  await a.store.save()
  await a.adapter.sync()
  drive.files.clear()
  const b = make({drive, storage, local})
  await b.store.load()
  await b.adapter.sync()
  assert('deleted in Drive: created again with the local items', contentOf(drive).theme === 'day')
  await b.adapter.forget()
  // MemoryAdapter has no default values: everything is gone (IndexedDBAdapter would give its defaults back)
  assert('forget: the local copy erased, the store loaded again', b.store.get('theme') === undefined && Object.keys(local.items).length === 0 &&
    b.adapter.pending.length === 0)
  captureConsole()
  const c = make({drive, storage, local, seed: async () => ({modules: 'yes'})})
  await c.store.load()
  releaseConsole()
  assert('after forget: the seed is not read again', c.store.get('modules') === undefined)
})

await describe('DriveConfig — Drive unreachable', async () => {
  const drive = new FakeDrive()
  drive.request = async () => { throw new Error('offline') }
  const {store, adapter} = make({drive})
  await store.load()
  store.setItem('theme', 'day')
  await store.save()
  captureConsole()
  await adapter.sync()
  releaseConsole()
  assert('the change waits locally', adapter.pending.join() === 'theme' && store.get('theme') === 'day')
})

await describe('DriveConfig — pull()', async () => {
  const drive = new FakeDrive()
  const {store, adapter} = make({drive})
  await store.load()
  await adapter.sync()
  const file = [...drive.files.values()].find(f => f.name === 'configuration.json')
  file.content = JSON.stringify({theme: 'night'})
  await adapter.pull()
  assert('pull: the changes of Drive come in again', store.get('theme') === 'night')
})
