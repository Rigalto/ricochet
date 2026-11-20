// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The fields of the data records of the application, reached by a logical address `table/record/field`, as the
 * configuration items are reached by their name: a component shows a field and changes it (`data-field`), without
 * knowing where the data lives. The application declares each table (`defineTable`): how to read a field, how to
 * change it. This module keeps no data.
 *
 * ```javascript
 * import {defineTable, fieldsChanged} from 'ricochet/core/fields.mjs'
 *
 * defineTable('notes', {
 *   get: (id, field) => notes.get(id)?.[field],
 *   set: (id, field, value) => { notes.get(id)[field] = value } // or false (or an exception): refused
 * })
 * ```
 *
 * ```html
 * <rc-checkbox data-field="notes/n42/done">Done</rc-checkbox>
 * <rc-icon-button icon="check" data-field="notes/n42/done" data-value="yes" title="Done"></rc-icon-button>
 * ```
 *
 * ## The address
 *
 * `table/record/field`: the name of the table (declared by `defineTable`, without `/`), the identifier of the record,
 * the name of the field (without `/`). The identifier is what lies between the first and the last `/`. A value is a
 * text, as for an item (`yes`/`no` for a box, a date as `YYYY-MM-DD`…): the table converts it.
 *
 * ## The table
 *
 * | Method | Role |
 * | --- | --- |
 * | `get(record, field)` | the value of the field (a text, or `undefined`: unknown record or field, data not loaded yet) |
 * | `set(record, field, value)` | changes the field; may be `async`; refuses by returning `false` or by throwing |
 *
 * The table checks the value as a form of the application would: a field changed by a shortcut (a box in a list)
 * follows the same rules as in the form.
 *
 * ## The changes: the event `fieldsChanged`
 *
 * Every change of a field is told by the event `fieldsChanged {table, record, field}` of the bus: any component may
 * follow it (the label of a record shown in a menu, a cell of a list…). Without `field`: every field of the record
 * may have changed; without `record` either: the whole table (read again, for instance).
 *
 * - `setField` emits it after the table accepted the change; after a refusal too, so that the components take back
 *   the value kept.
 * - The table emits it (`fieldsChanged(table, record, field)`) for the other changes: data read again, changed by
 *   another view, or a field changed with another one (a date of change).
 *
 * The event carries no value: each component reads again what it shows (`getField`). The kernel components with
 * `data-field` do it (`observeField` of `WController`); a component that follows many fields listens to the event
 * and sorts the changes with `matchField`, which accepts patterns (`*` for any part of the address).
 *
 * @module fields
 */

import {bus} from './bus.mjs'

/** The event of the bus that tells a change of fields. */
export const FIELDS_CHANGED = 'fieldsChanged'

const tables = new Map() // name → {get, set}

/**
 * Declares a table, or replaces it; `null` removes it.
 * @param {string} name - The name of the table, without `/`.
 * @param {{get: Function, set: Function}|null} table - How to read and change its fields.
 */
export const defineTable = (name, table) => {
  if (typeof name !== 'string' || name === '' || name.includes('/')) {
    console.error(`fields: '${name}' is not a name of table (a text without '/')`)
    return
  }
  if (table === null) {
    tables.delete(name)
    return
  }
  if (typeof table?.get !== 'function' || typeof table?.set !== 'function') {
    console.error(`fields: the table '${name}' needs the methods get(record, field) and set(record, field, value)`)
    return
  }
  tables.set(name, table)
}

/**
 * The parts of an address.
 * @param {string} address - `table/record/field`.
 * @returns {{table: string, record: string, field: string}|null} Its parts; `null` if it is not an address.
 */
export const splitField = address => {
  const text = String(address ?? '')
  const first = text.indexOf('/')
  const last = text.lastIndexOf('/')
  if (first <= 0 || last <= first + 1 || last === text.length - 1) { return null }
  return {table: text.slice(0, first), record: text.slice(first + 1, last), field: text.slice(last + 1)}
}

/**
 * The value of a field.
 * @param {string} address - `table/record/field`.
 * @returns {string|undefined} Its value; `undefined` for an unknown table, record or field, or data not loaded yet.
 */
export const getField = address => {
  const parts = splitField(address)
  const table = parts === null ? undefined : tables.get(parts.table)
  if (table === undefined) { return undefined }
  const value = table.get(parts.record, parts.field)
  return value === undefined || value === null ? undefined : String(value)
}

/**
 * Changes a field, then emits `fieldsChanged` (after a refusal too: the components take back the value kept). The
 * action `data-field` calls it.
 * @param {string} address - `table/record/field`.
 * @param {string} value - The new value.
 * @returns {Promise<boolean>} `true` if the table accepted the change.
 */
export const setField = async (address, value) => {
  const parts = splitField(address)
  if (parts === null) {
    console.error(`fields: '${address}' is not an address table/record/field`)
    return false
  }
  const table = tables.get(parts.table)
  if (table === undefined) {
    console.error(`fields: no table '${parts.table}' for '${address}' (defineTable)`)
    return false
  }
  let accepted
  try {
    accepted = (await table.set(parts.record, parts.field, String(value ?? ''))) !== false
  } catch (error) {
    console.error(`fields: '${address}' not changed`, error)
    accepted = false
  }
  bus.emit(FIELDS_CHANGED, parts)
  return accepted
}

/**
 * Tells that fields changed (for the table: data read again, changed elsewhere, a field changed with another).
 * @param {string} table - The table.
 * @param {string} [record] - The record; none: the whole table.
 * @param {string} [field] - The field; none: every field of the record.
 */
export const fieldsChanged = (table, record, field) => {
  const change = {table}
  if (record !== undefined && record !== null) {
    change.record = record
    if (field !== undefined && field !== null) { change.field = field }
  }
  bus.emit(FIELDS_CHANGED, change)
}

/**
 * Whether a change of fields concerns an address, or a pattern of addresses.
 *
 * - A pattern is an address where `*` stands for any part: `notes/n42/*` is every field of the note `n42`; with `*`
 *   in the place of the record, `label` for the field and `notes` for the table: the label of any note.
 * - A regular expression is tested on the whole address.
 * - A change without `record` (or without `field`) concerns every record (or every field): it matches any pattern of
 *   its table, and any regular expression (the listener reads again what it shows).
 * @param {string|RegExp} pattern - The address, the pattern or the regular expression.
 * @param {{table: string, record?: string, field?: string}|string} change - The payload of `fieldsChanged`, or an
 *   address.
 * @returns {boolean} Whether the change concerns it.
 */
export const matchField = (pattern, change) => {
  const parts = typeof change === 'string' ? splitField(change) : change
  if (parts === null || parts === undefined || typeof parts.table !== 'string') { return false }
  if (pattern instanceof RegExp) {
    if (parts.record === undefined || parts.field === undefined) { return true }
    return pattern.test(`${parts.table}/${parts.record}/${parts.field}`)
  }
  const wanted = splitField(pattern)
  if (wanted === null) { return false }
  const same = (want, part) => want === '*' || part === undefined || want === part
  return same(wanted.table, parts.table) && same(wanted.record, parts.record) && same(wanted.field, parts.field)
}
