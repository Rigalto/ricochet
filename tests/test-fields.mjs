// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-fields.mjs — node tests/run.mjs Fields
// The fields of records: tables, addresses, changes, the event fieldsChanged, patterns, observeField() of a
// controller, the action data-field. The components and the keys {field, value} are checked in the browser test page.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {defineTable, splitField, getField, setField, fieldsChanged, matchField, FIELDS_CHANGED} from '../src/core/fields.mjs'
import {runActions} from '../src/core/actions.mjs'
import {WController} from '../src/core/w-controller.mjs'
import {bus} from '../src/core/bus.mjs'
import {$global} from '../src/core/global.mjs'

// a table of notes in memory; `set` refuses an empty title, throws for the field `bad`, waits a little
const notes = new Map([['n1', {title: 'Garden', done: 'no'}], ['a/b', {title: 'Slash', done: 'yes'}]])
const NOTES = {
  get: (id, field) => notes.get(id)?.[field],
  set: async (id, field, value) => {
    await Promise.resolve()
    if (field === 'bad') { throw new Error('no such field') }
    if (field === 'title' && value === '') { return false }
    notes.get(id)[field] = value
  }
}

// the payloads of fieldsChanged, while a test listens
const record = () => {
  const seen = []
  const listener = change => seen.push(JSON.stringify(change))
  bus.on(FIELDS_CHANGED, listener)
  return {seen, stop: () => bus.off(FIELDS_CHANGED, listener)}
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

describe('Fields — addresses', () => {
  assert('table, record, field', JSON.stringify(splitField('notes/n1/title')) === '{"table":"notes","record":"n1","field":"title"}')
  assert('the record is what lies between the first and the last /', splitField('notes/a/b/done').record === 'a/b')
  assert('not an address: missing parts, empty parts', [undefined, '', 'notes', 'notes/n1', '/n1/title', 'notes//title', 'notes/n1/']
    .every(a => splitField(a) === null))
})

describe('Fields — tables', () => {
  captureConsole()
  defineTable('a/b', NOTES)
  defineTable('broken', {get: () => ''})
  const lines = releaseConsole()
  assert('a name with / or a table without get and set: refused, and said', lines.length === 2 && getField('broken/x/y') === undefined)
  defineTable('notes', NOTES)
  assert('a field read', getField('notes/n1/title') === 'Garden' && getField('notes/a/b/done') === 'yes')
  assert('unknown: table, record, field, or not an address', getField('other/n1/title') === undefined && getField('notes/n9/title') === undefined &&
    getField('notes/n1/color') === undefined && getField('notes') === undefined)
  defineTable('numbers', {get: () => 42, set: () => {}})
  assert('a value read as a text', getField('numbers/x/y') === '42')
  defineTable('numbers', null)
  assert('a table removed', getField('numbers/x/y') === undefined)
})

await describe('Fields — changes and fieldsChanged', async () => {
  const events = record()
  assert('accepted: true', await setField('notes/n1/done', 'yes') === true && notes.get('n1').done === 'yes')
  assert('… then fieldsChanged with the parts of the address', events.seen.join() === '{"table":"notes","record":"n1","field":"done"}')
  events.seen.length = 0
  assert('refused by false: false, nothing changed', await setField('notes/n1/title', '') === false && notes.get('n1').title === 'Garden')
  assert('… fieldsChanged all the same: the components take back the value kept', events.seen.length === 1)
  captureConsole()
  const thrown = await setField('notes/n1/bad', 'x')
  const unknown = await setField('other/n1/title', 'x')
  const wrong = await setField('notes/n1', 'x')
  const lines = releaseConsole()
  assert('refused by an exception: false, said in the console', thrown === false && lines[0].includes("'notes/n1/bad' not changed"))
  assert('unknown table, not an address: false, said, no event', unknown === false && wrong === false && lines.length === 3 && events.seen.length === 2)
  events.seen.length = 0
  await setField('notes/n1/done', 0)
  assert('the value given as a text', notes.get('n1').done === '0')
  events.seen.length = 0
  fieldsChanged('notes', 'n1', 'title')
  fieldsChanged('notes', 'n1')
  fieldsChanged('notes')
  fieldsChanged('notes', undefined, 'title')
  assert('told by the table: a field, a record, the whole table (a field without record: the table)', events.seen.join(' ') ===
    '{"table":"notes","record":"n1","field":"title"} {"table":"notes","record":"n1"} {"table":"notes"} {"table":"notes"}')
  events.stop()
})

describe('Fields — patterns', () => {
  const change = {table: 'notes', record: 'n1', field: 'title'}
  assert('the same address', matchField('notes/n1/title', change) && !matchField('notes/n1/done', change) && !matchField('notes/n2/title', change))
  assert('* for any part', matchField('notes/*/title', change) && matchField('*/*/title', change) && matchField('*/n1/*', change) &&
    !matchField('tasks/*/title', change))
  assert('a change of the record, of the table: every field, every record', matchField('notes/n1/done', {table: 'notes', record: 'n1'}) &&
    matchField('notes/n7/title', {table: 'notes'}) && !matchField('tasks/n1/title', {table: 'notes'}))
  assert('a regular expression on the whole address', matchField(/^notes\/.*\/title$/, change) && !matchField(/\/done$/, change))
  assert('… a change of a record or a table matches it (read again)', matchField(/\/done$/, {table: 'notes', record: 'n1'}))
  assert('the change as an address', matchField('notes/*/title', 'notes/n1/title'))
  assert('not a pattern, not a change', !matchField('notes', change) && !matchField('notes/*/title', 'nothing') && !matchField('notes/*/title', null))
})

await describe('Fields — observeField() of a controller', async () => {
  class C extends WController {
    constructor (address) {
      super()
      this.got = []
      this.observeField(address)
    }

    fieldChanged (value) { this.got.push(value) }
  }
  const before = $global.memoryLeak.eventHandlers
  const c = new C('notes/n1/title')
  assert('not at once (the attributes of a component first)', c.got.length === 0)
  await settle()
  assert('the value at the end of the task', c.got.join() === 'Garden')
  await setField('notes/n1/title', 'Orchard')
  assert('a change of the field: the value read again', c.got.join() === 'Garden,Orchard')
  fieldsChanged('notes', 'n1')
  fieldsChanged('notes')
  fieldsChanged('notes', 'n2', 'title')
  fieldsChanged('tasks')
  assert('a change of the record, of the table: read again; another record, another table: nothing', c.got.join() === 'Garden,Orchard,Orchard,Orchard')
  const later = new C('later/x/title')
  await settle()
  assert('a value still unknown: not called', later.got.length === 0)
  defineTable('later', {get: () => 'Loaded', set: () => {}})
  fieldsChanged('later')
  assert('… called once the table tells it is loaded', later.got.join() === 'Loaded')
  c.observeField('notes/n1/title')
  await settle()
  assert('observing twice in the same way: once', c.got.length === 4)
  const gone = new C('notes/n1/title')
  gone.release()
  await settle()
  assert('released before the end of the task: never called', gone.got.length === 0)
  c.release()
  later.release()
  defineTable('later', null)
  fieldsChanged('notes')
  assert('release(): no more calls, the leak counter back', c.got.length === 4 && $global.memoryLeak.eventHandlers === before)
})

await describe('Fields — the action data-field', async () => {
  const events = record()
  runActions({field: 'notes/n1/done', value: 'no'})
  assert('data-field + data-value: the change is not awaited', notes.get('n1').done !== 'no')
  await settle()
  assert('… then kept, and told', notes.get('n1').done === 'no' && events.seen.join() === '{"table":"notes","record":"n1","field":"done"}')
  captureConsole()
  runActions({field: 'notes/n1/done'})
  const lines = releaseConsole()
  assert('without data-value: nothing, said in the console', lines.length === 1 && lines[0].includes('without data-value'))
  const emitted = []
  const listener = payload => emitted.push(payload.value)
  bus.on('noteDone', listener)
  runActions({field: 'notes/n1/done', value: 'yes', event: 'noteDone'})
  await settle()
  bus.off('noteDone', listener)
  assert('with data-event: the field changed, the event emitted with the value', notes.get('n1').done === 'yes' && emitted.join() === 'yes')
  events.stop()
})
