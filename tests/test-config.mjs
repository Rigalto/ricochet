// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-config.mjs — node tests/run.mjs Config

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {ConfigStore, config} from '../src/core/config.mjs'
import {itemStore} from '../src/core/items.mjs'
import {MemoryAdapter} from '../src/adapters/memory.mjs'
import {IndexedDBAdapter} from '../src/adapters/indexeddb.mjs'
import {bus} from '../src/core/bus.mjs'
import '../src/core/loop.mjs' // the frame loop runs the scheduled tasks (the delayed saves)
import {$global} from '../src/core/global.mjs'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const tick = () => sleep(0) // lets the microtasks run

// a memory adapter that records its calls and can be made to fail
class SpyAdapter extends MemoryAdapter {
  constructor (items) {
    super(items)
    this.calls = []
    this.failSave = false
  }

  async load () { this.calls.push(['load']); return super.load() }

  async save (entries, options) {
    this.calls.push(['save', entries, options])
    if (this.failSave) { throw new Error('offline') }
    return super.save(entries)
  }

  async remove (items) { this.calls.push(['remove', items]); return super.remove(items) }
}

let storeCount = 0
const newStore = async (items = {}, options = {saveDelay: 20, retryDelay: 40}) => {
  const store = new ConfigStore({name: `test${++storeCount}`, ...options})
  const adapter = new SpyAdapter(items)
  store.setAdapter(adapter)
  await store.load()
  return {store, adapter}
}

describe('Config — registered as the item store', () => {
  assert('registered when the module is imported', itemStore() === config)
})

await describe('Config — load()', async () => {
  const store = new ConfigStore()
  const events = []
  const onLoaded = () => events.push('loaded')
  const onRefreshed = () => events.push('refreshed')
  bus.on('configLoaded', onLoaded)
  bus.on('configRefreshed', onRefreshed)
  let error = null
  try { await store.load() } catch (e) { error = e }
  assert('rejected without an adapter', error !== null)
  const adapter = new SpyAdapter({color: 'red'})
  store.setAdapter(adapter)
  assert('nothing before loading', store.get('color') === undefined && store.keys().length === 0 && !store.loaded)
  await store.load()
  assert('the items are there', store.get('color') === 'red' && store.loaded)
  await store.load()
  assert('configLoaded the first time, configRefreshed the next times', events.join() === 'loaded,refreshed')
  bus.off('configLoaded', onLoaded)
  bus.off('configRefreshed', onRefreshed)
  adapter.load = async () => { throw new Error('server down') }
  error = null
  try { await store.load() } catch (e) { error = e }
  assert('the error of the adapter rejects load()', error?.message === 'server down')
  assert('the former items stay readable', store.get('color') === 'red')
})

await describe('Config — observers', async () => {
  const {store} = await newStore({a: '1', b: '2'})
  const calls = []
  const id = store.addObserver(['a', 'b'], values => calls.push(values))
  assert('not called during the current task', calls.length === 0)
  await tick()
  assert('called with the current values', calls.length === 1 && calls[0].a === '1' && calls[0].b === '2')
  store.setItem('a', '10')
  store.setItem('b', '20')
  store.setItem('other', 'x')
  await tick()
  assert('one call for several changes in the same task', calls.length === 2 && calls[1].a === '10' && calls[1].b === '20')
  store.setItem('a', '10')
  await tick()
  assert('no call when the value does not change', calls.length === 2)
  store.setItem('a', '11')
  store.removeObserver(id)
  await tick()
  assert('a removed observer is not called', calls.length === 2)
  captureConsole()
  store.addObserver(['a'], () => { throw new Error('boom') })
  const after = []
  store.addObserver(['a'], values => after.push(values))
  await tick()
  const lines = releaseConsole()
  assert('a failing observer is reported and does not stop the others', lines.some(l => l.includes('an observer failed')) && after.length === 1)
})

await describe('Config — setItemIfValue()', async () => {
  const {store} = await newStore({mode: 'a'})
  store.setItemIfValue('mode', 'b', 'c')
  assert('unchanged if the value differs', store.get('mode') === 'a')
  store.setItemIfValue('mode', 'a', 'c')
  assert('changed if the value matches', store.get('mode') === 'c')
})

await describe('Config — saving', async () => {
  const {store, adapter} = await newStore({a: '1'})
  adapter.calls.length = 0
  store.setItem('a', '2')
  store.setItem('b', '3')
  store.setItem('a', '4')
  assert('not saved at once', adapter.calls.length === 0)
  await sleep(100)
  const saves = adapter.calls.filter(c => c[0] === 'save')
  assert('saved once after the delay, with the last values', saves.length === 1 && saves[0][1].length === 2 &&
    saves[0][1].find(e => e.item === 'a').value === '4')
  assert('stored by the adapter', adapter.items.a === '4' && adapter.items.b === '3')
  store.setItem('a', '5')
  assert('save() saves at once', await store.save({keepalive: true}) && adapter.items.a === '5')
  assert('keepalive is passed to the adapter', adapter.calls.at(-1)[2].keepalive === true)
  assert('nothing left to save', await store.save() && adapter.calls.filter(c => c[0] === 'save').length === 2)
})

await describe('Config — a failed save is tried again', async () => {
  const {store, adapter} = await newStore({a: '1'})
  adapter.failSave = true
  store.setItem('a', '2')
  captureConsole()
  const saved = await store.save()
  const lines = releaseConsole()
  assert('save() resolves with false and reports the error', saved === false && lines.some(l => l.includes('next attempt later')))
  adapter.failSave = false
  await sleep(150)
  assert('saved after the retry delay', adapter.items.a === '2')
})

await describe('Config — saved before loading again', async () => {
  const {store, adapter} = await newStore({a: '1'})
  store.setItem('a', '2')
  await store.load()
  assert('the change is kept', store.get('a') === '2' && adapter.items.a === '2')
})

await describe('Config — no change while loading', async () => {
  const {store, adapter} = await newStore({a: '1'})
  let release
  adapter.load = () => new Promise(resolve => { release = () => resolve({a: '1'}) })
  const loading = store.load()
  await tick()
  captureConsole()
  store.setItem('a', '2')
  const lines = releaseConsole()
  release()
  await loading
  assert('the change is ignored with a warning', store.get('a') === '1' && lines.some(l => l.includes('change ignored')))
  const fresh = new ConfigStore()
  captureConsole()
  fresh.setItem('a', '2')
  releaseConsole()
  assert('ignored before the first load too', fresh.get('a') === undefined)
})

await describe('Config — scope', async () => {
  const {store} = await newStore({'sort-hom': 'name', 'sort-gam': 'date', 'sort-sim': 'name', size: '3'})
  const calls = []
  store.addObserver(['sort-$', 'size'], values => calls.push(values))
  const plain = []
  store.addObserver(['size'], values => plain.push(values))
  store.setScope('hom')
  await tick()
  calls.length = 0
  plain.length = 0
  assert('$ is replaced by the scope', store.get('sort-$') === 'name' && store.scope === 'hom')
  store.setScope('gam')
  await tick()
  assert('called when a value changes, keyed by the names given', calls.length === 1 && calls[0]['sort-$'] === 'date')
  assert('observers without $ are not called', plain.length === 0)
  store.setScope('hom')
  await tick()
  calls.length = 0
  store.setScope('sim')
  await tick()
  assert('not called when the values are the same', calls.length === 0 && store.get('sort-$') === 'name')
  store.setScope('hom')
  store.setItem('sort-$', 'size')
  assert('setItem() resolves $', store.get('sort-hom') === 'size')
  await tick()
  assert('the observer of sort-$ is called', calls.at(-1)['sort-$'] === 'size')
})

await describe('Config — remove()', async () => {
  const {store, adapter} = await newStore({a: '1', b: '2'})
  const calls = []
  store.addObserver(['a'], values => calls.push(values))
  await tick()
  await store.remove('a')
  await tick()
  assert('removed in memory and by the adapter', store.get('a') === undefined && adapter.items.a === undefined)
  assert('the observer is called', calls.length === 2 && calls[1].a === undefined)
  assert('keys() no longer lists it', store.keys().join() === 'b')
})

await describe('Config — logs', async () => {
  const {store} = await newStore({a: '1'})
  store.setItem('a', '2')
  const entry = $global.logs.items[0]
  assert('the change is recorded', entry.item === 'a' && entry.previous === '1' && entry.current === '2')
  assert('and in the timeline', $global.logs.timeline[0].detail === '1 => 2')
})

await describe('IndexedDBAdapter — without IndexedDB (Node)', async () => {
  const adapter = new IndexedDBAdapter('test-app', {theme: 'day', size: 'm'})
  captureConsole()
  const loaded = await adapter.load()
  const lines = releaseConsole()
  assert('warns that the items are kept in memory', lines.some(line => line.includes('kept in memory')) && adapter.inMemory)
  assert('the default values at first', loaded.theme === 'day' && loaded.size === 'm')
  await adapter.save([{item: 'theme', value: 'night'}, {item: 'zoom', value: '2'}])
  await adapter.remove(['size'])
  captureConsole()
  const again = await adapter.load()
  const quiet = releaseConsole()
  assert('saved and removed items, over the defaults', again.theme === 'night' && again.zoom === '2' && again.size === 'm')
  assert('the warning comes once', quiet.length === 0)
  captureConsole()
  const noName = new IndexedDBAdapter()
  const errors = releaseConsole()
  assert('a database name is required', noName.name === undefined && errors.some(line => line.includes('database name')))
  const {store} = await newStore({})
  store.setAdapter(new IndexedDBAdapter('test-store', {a: '1'}))
  captureConsole()
  await store.load()
  releaseConsole()
  assert('works as the adapter of a store', store.get('a') === '1')
})

