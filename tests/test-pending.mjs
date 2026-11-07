// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-pending.mjs — node tests/run.mjs Pending
// The register of the changes not saved yet: the total, the state of the whole, the event.

import {describe, assert} from './kernel.mjs'
import {PendingWrites} from '../src/core/pending.mjs'
import {bus} from '../src/core/bus.mjs'

describe('Pending — the register', () => {
  const register = new PendingWrites()
  const seen = []
  const listener = payload => seen.push(payload)
  bus.on('pendingChanged', listener)
  assert('at first: nothing waits', register.total === 0 && register.state === 'idle' && register.savedAt === 0)
  register.report('config', {count: 2, state: 'queued'})
  assert('a source: the total, its state, the event', register.total === 2 && register.state === 'queued' && seen.length === 1 &&
    seen[0].sources.config.count === 2)
  register.report('config', {count: 2, state: 'queued'})
  assert('the same report again: no event', seen.length === 1)
  register.report('cards', {count: 1, state: 'offline'})
  assert('the most serious state wins', register.total === 3 && register.state === 'offline')
  register.report('tasks', {count: 1, state: 'error'})
  assert('error before everything', register.state === 'error')
  register.report('tasks', {count: 0, state: 'error'})
  assert('no change: idle, whatever it says', register.summary.sources.tasks.state === 'idle' && register.state === 'offline')
  register.report('config', {count: 0, state: 'saving', saved: true})
  assert('a sending succeeded: its time', register.savedAt > 0 && register.total === 1 && seen.at(-1).savedAt === register.savedAt)
  register.report('cards', {count: 3})
  assert('a count without a state: queued', register.summary.sources.cards.state === 'queued')
  bus.off('pendingChanged', listener)
})
