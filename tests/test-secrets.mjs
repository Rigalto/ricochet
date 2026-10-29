// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-secrets.mjs — node tests/run.mjs Secrets

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {SecretStore, secrets} from '../src/core/secrets.mjs'
import {bus} from '../src/core/bus.mjs'
import {$global} from '../src/core/global.mjs'
import '../src/core/debug.mjs' // the tracer of the bus, which writes the events to the logs

// a storage with the interface of localStorage
class FakeStorage {
  #map = new Map()
  get length () { return this.#map.size }
  key (i) { return [...this.#map.keys()][i] ?? null }
  getItem (key) { return this.#map.get(key) ?? null }
  setItem (key, value) { this.#map.set(key, String(value)) }
  removeItem (key) { this.#map.delete(key) }
  keys () { return [...this.#map.keys()] }
}

// the events secretChanged emitted while running fn
const changes = fn => {
  const seen = []
  const listener = payload => seen.push(payload)
  bus.on('secretChanged', listener)
  try { fn() } finally { bus.off('secretChanged', listener) }
  return seen
}

describe('Secrets — in a storage', () => {
  const storage = new FakeStorage()
  storage.setItem('other-key', 'kept')
  const store = new SecretStore({storage})
  assert('not set: null', store.get('aqicn') === null && !store.has('aqicn') && !store.inMemory)
  let seen = changes(() => store.set('aqicn', '  abc123 \n'))
  assert('set: trimmed, stored with the prefix', store.get('aqicn') === 'abc123' &&
    storage.getItem('ricochet-secret-aqicn') === 'abc123')
  assert('secretChanged with the name, without the value', seen.length === 1 && JSON.stringify(seen[0]) === '{"name":"aqicn"}')
  seen = changes(() => store.set('aqicn', 'abc123'))
  assert('the same value: no event', seen.length === 0)
  store.set('mqtt-password', 'p')
  assert('names: only the secrets, sorted', JSON.stringify(store.names()) === '["aqicn","mqtt-password"]')
  seen = changes(() => store.set('aqicn', '   '))
  assert('an empty value removes', store.get('aqicn') === null && storage.getItem('ricochet-secret-aqicn') === null &&
    seen.length === 1)
  seen = changes(() => store.remove('aqicn'))
  assert('removing a missing secret: no event', seen.length === 0)
  store.remove('mqtt-password')
  assert('the other keys of the storage are left', JSON.stringify(storage.keys()) === '["other-key"]')
  const other = new SecretStore({storage, prefix: 'app-'})
  other.set('k', 'v')
  assert('another prefix, other secrets', store.names().length === 0 && other.get('k') === 'v')
})

describe('Secrets — the value is never logged', () => {
  const saved = $global.debug.eventbus
  $global.debug.eventbus = true
  captureConsole()
  const store = new SecretStore({storage: new FakeStorage()})
  store.set('token', 'very-secret-value')
  const lines = releaseConsole()
  $global.debug.eventbus = saved
  const logged = JSON.stringify($global.logs.events[0]) + lines.join('\n')
  assert('the event is logged', logged.includes('secretChanged'))
  assert('not its value', !logged.includes('very-secret-value'))
})

describe('Secrets — wrong names, refused storage', () => {
  captureConsole()
  const store = new SecretStore({storage: new FakeStorage()})
  store.set('', 'x')
  const value = store.get(undefined)
  let lines = releaseConsole()
  assert('a name is expected', value === null && lines.filter(l => l.includes('a name is expected')).length === 2)
  const full = new FakeStorage()
  full.setItem = () => { throw new Error('quota exceeded') }
  const store2 = new SecretStore({storage: full})
  captureConsole()
  const seen = changes(() => store2.set('k', 'v'))
  lines = releaseConsole()
  assert('a full storage: an error, no event', seen.length === 0 && lines.some(l => l.includes('cannot be stored')))
})

describe('Secrets — without local storage (Node)', () => {
  captureConsole()
  const store = new SecretStore()
  const inMemory = store.inMemory
  store.set('k', 'v')
  store.set('a', 'b')
  const lines = releaseConsole()
  assert('kept in memory, with one warning', inMemory && lines.length === 1 && lines[0].includes('kept in memory'))
  assert('works in memory', store.get('k') === 'v' && JSON.stringify(store.names()) === '["a","k"]')
  store.remove('k')
  assert('remove in memory', !store.has('k'))
  assert('the shared instance', secrets instanceof SecretStore)
})
