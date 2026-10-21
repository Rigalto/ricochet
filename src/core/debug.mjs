// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Debugging tools of the kernel, installed when the module is imported, and the functions an application uses to add
 * its own. The guide `docs/DEBUG.md` explains them; the state is `window.$global` (see the `global` module).
 *
 * Installed by the kernel:
 *
 * - every event emitted on the bus is recorded in `$global.logs.events` and `$global.logs.timeline`, and shown in the
 *   console when `$global.debug.eventbus` is true (except the events of `quietEvents`);
 * - the attach and detach of components are shown when `$global.debug.lifecycle` is true;
 * - `console.error`, failed `console.assert` and uncaught errors are counted in `$global.errors`: `console.error` and
 *   `console.assert` are wrapped, the only change Ricochet makes to an object of the browser.
 *
 * For the application:
 *
 * | Function | Role |
 * | --- | --- |
 * | `addDebugSwitches({name: value})` | declares switches of the application in `$global.debug` (a switch already set is kept) |
 * | `trace(switch, …values)` | writes in the console when the switch is on |
 * | `addLog(name, entry, timelineEntry)` | records an entry in `$global.logs[name]` and in the timeline (100 entries each) |
 * | `countLeak(name, delta)` | moves a counter of `$global.memoryLeak`: +1 when a subscription is made, -1 when it is released |
 * | `leakSnapshot()`, `leakChanges(snapshot)` | the counters now, and those that changed since a snapshot |
 *
 * @module debug
 */

import {bus} from './bus.mjs'
import {$global} from './global.mjs'

const MAX_LOG = 100

/**
 * Current time as `hh:mm:ss.mmm`, the format of the logs.
 * @param {Date} [date] - Default: now.
 * @returns {string} The formatted time.
 */
export const logTime = (date = new Date()) => {
  const pad = (n, size) => String(n).padStart(size, '0')
  return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}.${pad(date.getMilliseconds(), 3)}`
}

/**
 * Adds an entry at the head of a log, keeping at most 100 entries.
 * @param {Array} log - One of the arrays of `$global.logs`.
 * @param {object} entry - The entry to add.
 */
export const pushLog = (log, entry) => {
  if (log.length >= MAX_LOG) { log.pop() }
  log.unshift(entry)
}

/**
 * Declares switches of the application in `$global.debug`, with their default value. A switch already set (by the
 * application before loading Ricochet, or in the console) keeps its value.
 * @param {Object<string, boolean>} switches - Name → default value.
 */
export const addDebugSwitches = switches => {
  for (const [name, value] of Object.entries(switches)) {
    if ($global.debug[name] === undefined) { $global.debug[name] = value }
  }
}

/**
 * Writes in the console when a switch of `$global.debug` is on: `trace('ajax', url, status)` shows
 * `AJAX - url status` while `$global.debug.ajax` is true.
 * @param {string} name - Name of the switch.
 * @param {...*} values - What to write.
 */
export const trace = (name, ...values) => {
  if ($global.debug[name]) { console.warn(`${name.toUpperCase()} -`, ...values) }
}

/**
 * Records an entry in a log of `$global.logs` (created if it does not exist) and in the timeline, with the time.
 * Each log keeps the last 100 entries.
 * @param {string} name - Name of the log: `ajax`, `mqtt`…
 * @param {object} entry - The entry, as it is kept in its log.
 * @param {object} [timelineEntry] - The entry as it is kept in the timeline, if it must be shorter; its first key
 *   should be the name of the log in the singular (`{ajax: url, detail}`), so that the timeline tells the logs apart.
 */
export const addLog = (name, entry, timelineEntry = entry) => {
  const time = logTime()
  if (!Array.isArray($global.logs[name])) { $global.logs[name] = [] }
  pushLog($global.logs[name], {...entry, time})
  pushLog($global.logs.timeline, {...timelineEntry, time})
}

/**
 * Moves a leak counter of `$global.memoryLeak` (created if it does not exist): +1 when the application makes a
 * subscription, a timer, an observer; -1 when it releases it.
 * @param {string} name - Name of the counter.
 * @param {number} delta - +1 or -1.
 */
export const countLeak = (name, delta) => { $global.memoryLeak[name] = ($global.memoryLeak[name] ?? 0) + delta }

/**
 * The leak counters now, to compare them later with `leakChanges()`.
 * @returns {Object<string, number>} A copy of `$global.memoryLeak`.
 */
export const leakSnapshot = () => ({...$global.memoryLeak})

/**
 * The leak counters that changed since a snapshot: after a view is opened and closed, they should all be back.
 * @param {Object<string, number>} snapshot - Given by `leakSnapshot()`.
 * @returns {Object<string, number>} Name → change; empty if nothing changed.
 */
export const leakChanges = snapshot => {
  const changes = {}
  for (const [name, value] of Object.entries($global.memoryLeak)) {
    const delta = value - (snapshot[name] ?? 0)
    if (delta !== 0) { changes[name] = delta }
  }
  return changes
}

const toText = detail => {
  try {
    return JSON.stringify(detail ?? {}).replaceAll(',"', ', "').replaceAll(':', ': ')
  } catch {
    return String(detail) // circular structure or DOM node
  }
}

/**
 * Events that are not recorded in the logs: frequent kernel events, such as the calls of `setInterval()`.
 */
export const quietEvents = new Set()

bus.setTracer((event, detail) => {
  if (quietEvents.has(event)) { return }
  if ($global.debug.eventbus) { console.warn(`EVENT - ${event}`, detail) }
  const entry = {event, time: logTime(), detail: toText(detail)}
  pushLog($global.logs.events, entry)
  pushLog($global.logs.timeline, entry)
})

const originalAssert = console.assert
console.assert = (test, ...args) => {
  if (!test) { $global.errors.assert += 1 }
  originalAssert(test, ...args)
}

const originalError = console.error
console.error = (...args) => {
  $global.errors.error += 1
  originalError(...args)
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', () => { $global.errors.error += 1 })
  window.addEventListener('unhandledrejection', () => { $global.errors.error += 1 })
}
