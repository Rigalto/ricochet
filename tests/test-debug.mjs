// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-debug.mjs — node tests/run.mjs Debug
// The debugging state ($global), the tools of the debug module, and the display mode.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {$global} from '../src/core/global.mjs'
import {addDebugSwitches, trace, addLog, countLeak, leakSnapshot, leakChanges} from '../src/core/debug.mjs'
import {displayMode, chooseDisplayMode, PHONE_MAX_SIDE} from '../src/core/display.mjs'
import {bus} from '../src/core/bus.mjs'

describe('Debug — the state', () => {
  assert('the same object as globalThis.$global', globalThis.$global === $global)
  assert('the kernel keys', ['debug', 'logs', 'errors', 'memoryLeak'].every(key => typeof $global[key] === 'object'))
  assert('errors: error and assert', typeof $global.errors.error === 'number' && typeof $global.errors.assert === 'number')
  assert('no application keys in the kernel', $global.memoryLeak.ajaxObserver === undefined && $global.logs.ajax === undefined)
})

describe('Debug — errors are counted', () => {
  const {error, assert: asserted} = $global.errors
  // the wrappers of the kernel write to the real console: two expected lines
  console.error('(expected) a console.error counted by the test')
  console.assert(false, '(expected) a failed console.assert counted by the test')
  console.assert(true, 'fine')
  assert('console.error', $global.errors.error === error + 1)
  assert('console.assert, only when it fails', $global.errors.assert === asserted + 1)
})

describe('Debug — switches and trace()', () => {
  $global.debug.tdPreset = true
  addDebugSwitches({tdPreset: false, tdNew: false})
  assert('a new switch gets its default', $global.debug.tdNew === false)
  assert('a switch already set keeps its value', $global.debug.tdPreset === true)
  captureConsole()
  trace('tdNew', 'hidden')
  trace('tdPreset', 'shown', 12)
  const lines = releaseConsole()
  assert('trace() writes only when the switch is on', lines.length === 1 && lines[0] === 'TDPRESET - shown 12')
  delete $global.debug.tdPreset
  delete $global.debug.tdNew
})

describe('Debug — logs', () => {
  addLog('tdAjax', {url: 'a/b', status: 200}, {tdAjax: 'a/b (200)'})
  const entry = $global.logs.tdAjax[0]
  assert('a new log is created, with the time', entry.url === 'a/b' && /^\d\d:\d\d:\d\d\.\d{3}$/.test(entry.time))
  assert('… and the timeline gets the short entry', $global.logs.timeline[0].tdAjax === 'a/b (200)' && $global.logs.timeline[0].url === undefined)
  addLog('tdOther', {x: 1})
  assert('without a timeline entry: the entry itself', $global.logs.timeline[0].x === 1)
  for (let i = 0; i < 120; i++) { addLog('tdAjax', {i}) }
  assert('100 entries at most, the last first', $global.logs.tdAjax.length === 100 && $global.logs.tdAjax[0].i === 119 &&
    $global.logs.timeline.length === 100)
  bus.emit('tdLogged', {a: 1})
  assert('the events of the bus are logged', $global.logs.events[0].event === 'tdLogged' && $global.logs.timeline[0].event === 'tdLogged')
  delete $global.logs.tdAjax
  delete $global.logs.tdOther
})

describe('Debug — leak counters', () => {
  const before = leakSnapshot()
  countLeak('tdObserver', 1)
  countLeak('tdObserver', 1)
  countLeak('eventHandlers', 1)
  assert('a new counter is created', $global.memoryLeak.tdObserver === 2)
  const changes = leakChanges(before)
  assert('leakChanges: what moved', changes.tdObserver === 2 && changes.eventHandlers === 1 && Object.keys(changes).length === 2)
  countLeak('tdObserver', -2)
  countLeak('eventHandlers', -1)
  assert('all back: no change', Object.keys(leakChanges(before)).length === 0)
  delete $global.memoryLeak.tdObserver
})

describe('Debug — display mode', () => {
  assert('without a screen (Node): pc', displayMode === 'pc')
  assert('forced phone', chooseDisplayMode('phone') === 'phone' && displayMode === 'phone')
  assert('forced pc', chooseDisplayMode('pc') === 'pc' && displayMode === 'pc')
  globalThis.screen = {width: 1920, height: 1080}
  assert('auto, a computer', chooseDisplayMode('auto') === 'pc')
  globalThis.screen = {width: 390, height: 844}
  assert('auto, a phone upright', chooseDisplayMode() === 'phone')
  globalThis.screen = {width: 844, height: 390}
  assert('auto, a phone on its side', chooseDisplayMode(undefined) === 'phone')
  globalThis.screen = {width: 820, height: 1180}
  assert('auto, a tablet: pc', chooseDisplayMode('auto') === 'pc' && PHONE_MAX_SIDE === 600)
  assert('an unknown setting: auto', chooseDisplayMode('watch') === 'pc')
  delete globalThis.screen
  chooseDisplayMode()
})
