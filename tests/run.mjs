// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/run.mjs — runs the unit tests of the kernel, from the repository root:
//
//   node tests/run.mjs          all the tests, one line per suite
//   node tests/run.mjs Bus      one module, every assertion shown
//
// The exit code is 1 when a test fails.

import {results} from './kernel.mjs'

const REGISTRY = [
  {name: 'Bus', file: './test-bus.mjs'},
  {name: 'WController', file: './test-w-controller.mjs'},
  {name: 'Tasks', file: './test-tasks.mjs'},
  {name: 'Config', file: './test-config.mjs'},
  {name: 'Css', file: './test-css.mjs'},
  {name: 'Events', file: './test-events.mjs'},
]

const target = process.argv[2] ?? null
const entries = target === null ? REGISTRY : REGISTRY.filter(e => e.name.toLowerCase() === target.toLowerCase())

if (entries.length === 0) {
  console.error(`❓ Unknown module: "${target}"`)
  console.error(`   Available: ${REGISTRY.map(e => e.name).join(', ')}`)
  process.exit(1)
}

for (const entry of entries) { await import(entry.file) }

const verbose = target !== null
let totalPassed = 0
let totalFailed = 0

for (const suite of results) {
  totalPassed += suite.passed
  totalFailed += suite.failed
  const icon = suite.failed === 0 ? '✅' : '❌'
  if (verbose || suite.failed > 0) {
    console.log(`\n📦 ${suite.label}`)
    for (const line of suite.lines) { console.log(line) }
    console.log(`   ${icon} ${suite.passed} passed, ${suite.failed} failed`)
  } else {
    console.log(`${icon} ${suite.label.padEnd(48)} ${suite.passed} ✅`)
  }
}

console.log(`\n${'─'.repeat(56)}`)
const green = totalFailed === 0
console.log(`${green ? '✅' : '❌'} Total: ${totalPassed} passed, ${totalFailed} failed`)
if (!green) { process.exit(1) }
