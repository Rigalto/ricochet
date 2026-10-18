// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-events.mjs — node tests/run.mjs Events
// Every event emitted or listened to by the kernel is listed in docs/EVENTS.md, every configuration item it uses in
// docs/ITEMS.md.

import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, assert} from './kernel.mjs'

const root = fileURLToPath(new URL('..', import.meta.url)) // not .pathname: '/C:/…' on Windows
const table = readFileSync(join(root, 'docs/EVENTS.md'), 'utf8')
const itemTable = readFileSync(join(root, 'docs/ITEMS.md'), 'utf8')
// the .mjs files under src/, as paths relative to it (readdirSync has no recursive option before Node 20)
const walk = dir => readdirSync(join(root, 'src', dir), {withFileTypes: true}).flatMap(entry =>
  entry.isDirectory() ? walk(join(dir, entry.name)) : entry.name.endsWith('.mjs') ? [join(dir, entry.name)] : [])
const files = walk('')

const found = new Map() // event → file
const items = new Map() // configuration item → file
for (const file of files) {
  const source = readFileSync(join(root, 'src', file), 'utf8')
  // the code without its comments: the examples of the documentation are not events of the kernel
  const code = source.split('\n').filter(line => !/^\s*(\*|\/\/|\/\*\*)/.test(line)).join('\n')
  const searches = [
    [code, /bus\.(?:on|emit)\(\s*'([A-Za-z0-9]+)'/g], // bus.on('name' / bus.emit('name'
    [source, /@(?:fires|listens)\s+(?:\{\{.*?\}\}\s+|\{[^}]*\}\s+)?([A-Za-z0-9]+)/g], // documented stimuli
    [source, /\b(rc[A-Z][A-Za-z0-9]*)\b/g], // reserved names, also those built in the code (rcConfigSave)
  ]
  for (const [text, pattern] of searches) {
    for (const [, name] of text.matchAll(pattern)) { if (!found.has(name)) { found.set(name, file) } }
  }
  for (const [, name] of source.matchAll(/'(ricochet-[a-z0-9-]+)'/g)) { if (!items.has(name)) { items.set(name, file) } }
}

describe('Events — docs/EVENTS.md lists every kernel event', () => {
  assert('events found in the sources', found.size >= 6)
  for (const [name, file] of found) {
    assert(`${name} (${file})`, table.includes(`| \`${name}\` |`))
  }
})

describe('Events — docs/ITEMS.md lists every configuration item of the kernel', () => {
  assert('items found in the sources', items.size >= 1)
  for (const [name, file] of items) {
    assert(`${name} (${file})`, itemTable.includes(`| \`${name}\` |`))
  }
})
