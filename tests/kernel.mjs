// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/kernel.mjs — a minimal unit test kernel, without dependency.
//
// describe(label, fn) groups assertions; assert(label, condition) records one result. fn may be async: then
// `await describe(…)`.
// captureConsole() / releaseConsole() silence the console during a test and return what was written,
// so that expected warnings and errors can be checked.

let currentSuite = null
export const results = []

const realLog = console.log
const realError = console.error
const realWarn = console.warn
let captured = null // null: no capture in progress

export function captureConsole () {
  captured = []
  console.log = (...args) => captured.push(args.join(' '))
  console.error = (...args) => captured.push(args.join(' '))
  console.warn = (...args) => captured.push(args.join(' '))
}

export function releaseConsole () {
  console.log = realLog
  console.error = realError
  console.warn = realWarn
  const lines = captured ?? []
  captured = null
  return lines
}

// An asynchronous test returns a promise: the test file awaits describe(), so that suites never overlap.
export function describe (label, fn) {
  const suite = {label, passed: 0, failed: 0, lines: []}
  const fail = error => {
    suite.failed++
    suite.lines.push(`  ❌ unexpected error: ${error.message}`)
  }
  const end = () => {
    currentSuite = null
    results.push(suite)
  }
  currentSuite = suite
  let result
  try {
    result = fn()
  } catch (error) {
    fail(error)
  }
  if (result instanceof Promise) {
    return result.catch(fail).finally(end)
  }
  end()
}

export function assert (label, condition) {
  if (currentSuite === null) { throw new Error(`assert() called outside describe(): "${label}"`) }
  if (condition) {
    currentSuite.passed++
    currentSuite.lines.push(`  ✅ ${label}`)
  } else {
    currentSuite.failed++
    currentSuite.lines.push(`  ❌ ${label}`)
  }
}
