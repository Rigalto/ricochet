// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Debugging tools of the kernel, installed when the module is imported:
 *
 * - every event emitted on the bus is recorded in `$global.logs.events` and `$global.logs.timeline` (100 entries
 *   each), and shown in the console when `$global.debug.eventbus` is true;
 * - `console.lifecycle(…)` writes attach/detach messages when `$global.debug.lifecycle` is true;
 * - `console.error`, failed `console.assert` and uncaught errors are counted in `$global.memoryLeak`.
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

const toText = detail => {
  try {
    return JSON.stringify(detail ?? {}).replaceAll(',"', ', "').replaceAll(':', ': ')
  } catch {
    return String(detail) // circular structure or DOM node
  }
}

bus.setTracer((event, detail) => {
  if ($global.debug.eventbus) { console.warn(`EVENT - ${event}`, detail) }
  const entry = {event, time: logTime(), detail: toText(detail)}
  pushLog($global.logs.events, entry)
  pushLog($global.logs.timeline, entry)
})

console.lifecycle = (...args) => {
  if ($global.debug.lifecycle) { console.warn(...args) }
}

const originalAssert = console.assert
console.assert = (test, ...args) => {
  if (!test) { $global.memoryLeak.consoleAssert += 1 }
  originalAssert(test, ...args)
}

const originalError = console.error
console.error = (...args) => {
  $global.memoryLeak.consoleError += 1
  originalError(...args)
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', () => { $global.memoryLeak.consoleError += 1 })
}
