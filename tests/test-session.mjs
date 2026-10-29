// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-session.mjs — node tests/run.mjs Session

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {SessionStore, session} from '../src/core/session.mjs'

// a storage with the interface of sessionStorage
class FakeStorage {
  #map = new Map()
  get length () { return this.#map.size }
  key (i) { return [...this.#map.keys()][i] ?? null }
  getItem (key) { return this.#map.get(key) ?? null }
  setItem (key, value) { this.#map.set(key, String(value)) }
  removeItem (key) { this.#map.delete(key) }
  keys () { return [...this.#map.keys()] }
}

describe('Session — in a storage', () => {
  const storage = new FakeStorage()
  storage.setItem('other-key', 'kept')
  const store = new SessionStore({storage})
  assert('nothing stored: the fallback', store.get('history') === null && JSON.stringify(store.get('history', [])) === '[]')
  store.set('history', [{path: '#hom/not', label: 'Notes'}])
  assert('stored as JSON with the prefix', storage.getItem('ricochet-session-history') === '[{"path":"#hom/not","label":"Notes"}]')
  const first = store.get('history')
  first[0].label = 'changed'
  assert('read back, a new copy each time', store.get('history')[0].label === 'Notes')
  store.set('count', 3)
  store.set('flag', false)
  assert('numbers and booleans', store.get('count') === 3 && store.get('flag', true) === false)
  assert('names: only the values of the store, sorted', JSON.stringify(store.names()) === '["count","flag","history"]')
  store.set('count', undefined)
  store.remove('flag')
  assert('undefined and remove() delete', store.get('count') === null && store.get('flag') === null)
  storage.setItem('ricochet-session-broken', '{not json')
  assert('a text that is not JSON: the fallback', store.get('broken', 'x') === 'x')
  const other = new SessionStore({storage, prefix: 'app-'})
  other.set('k', 'v')
  assert('another prefix, other values', other.get('k') === 'v' && !store.names().includes('k'))
  assert('the other keys of the storage are left', storage.getItem('other-key') === 'kept')
})

describe('Session — wrong names, values JSON cannot write', () => {
  const store = new SessionStore({storage: new FakeStorage()})
  captureConsole()
  store.set('', 1)
  const value = store.get(undefined, 'fallback')
  const cyclic = {}
  cyclic.self = cyclic
  store.set('cyclic', cyclic)
  const lines = releaseConsole()
  assert('a name is expected', value === 'fallback' && lines.filter(l => l.includes('a name is expected')).length === 2)
  assert('a cyclic value: an error, nothing stored', lines.some(l => l.includes('cannot be stored')) && store.get('cyclic') === null)
})

describe('Session — without session storage (Node)', () => {
  captureConsole()
  const store = new SessionStore()
  const inMemory = store.inMemory
  store.set('a', {b: 1})
  const lines = releaseConsole()
  assert('kept in memory, with one warning', inMemory && lines.length === 1 && lines[0].includes('kept in memory'))
  assert('works in memory', store.get('a').b === 1 && JSON.stringify(store.names()) === '["a"]')
  store.remove('a')
  assert('remove in memory', store.get('a') === null)
  assert('the shared instance', session instanceof SessionStore)
})
