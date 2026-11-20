# fields

Module `fields` · group `core` · source [`src/core/fields.mjs`](../../src/core/fields.mjs)

The fields of the data records of the application, reached by a logical address `table/record/field`, as the
configuration items are reached by their name: a component shows a field and changes it (`data-field`), without
knowing where the data lives. The application declares each table (`defineTable`): how to read a field, how to
change it. This module keeps no data.

```javascript
import {defineTable, fieldsChanged} from 'ricochet/core/fields.mjs'

defineTable('notes', {
  get: (id, field) => notes.get(id)?.[field],
  set: (id, field, value) => { notes.get(id)[field] = value } // or false (or an exception): refused
})
```

```html
<rc-checkbox data-field="notes/n42/done">Done</rc-checkbox>
<rc-icon-button icon="check" data-field="notes/n42/done" data-value="yes" title="Done"></rc-icon-button>
```

## The address

`table/record/field`: the name of the table (declared by `defineTable`, without `/`), the identifier of the record,
the name of the field (without `/`). The identifier is what lies between the first and the last `/`. A value is a
text, as for an item (`yes`/`no` for a box, a date as `YYYY-MM-DD`…): the table converts it.

## The table

| Method | Role |
| --- | --- |
| `get(record, field)` | the value of the field (a text, or `undefined`: unknown record or field, data not loaded yet) |
| `set(record, field, value)` | changes the field; may be `async`; refuses by returning `false` or by throwing |

The table checks the value as a form of the application would: a field changed by a shortcut (a box in a list)
follows the same rules as in the form.

## The changes: the event `fieldsChanged`

Every change of a field is told by the event `fieldsChanged {table, record, field}` of the bus: any component may
follow it (the label of a record shown in a menu, a cell of a list…). Without `field`: every field of the record
may have changed; without `record` either: the whole table (read again, for instance).

- `setField` emits it after the table accepted the change; after a refusal too, so that the components take back
  the value kept.
- The table emits it (`fieldsChanged(table, record, field)`) for the other changes: data read again, changed by
  another view, or a field changed with another one (a date of change).

The event carries no value: each component reads again what it shows (`getField`). The kernel components with
`data-field` do it (`observeField` of `WController`); a component that follows many fields listens to the event
and sorts the changes with `matchField`, which accepts patterns (`*` for any part of the address).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `FIELDS_CHANGED` | const | The event of the bus that tells a change of fields. |
| `defineTable` | function | Declares a table, or replaces it; `null` removes it. |
| `splitField` | function | The parts of an address. |
| `getField` | function | The value of a field. |
| `setField` | function | Changes a field, then emits `fieldsChanged` (after a refusal too: the components take back the value kept). The action `data-field` calls it. |
| `fieldsChanged` | function | Tells that fields changed (for the table: data read again, changed elsewhere, a field changed with another). |
| `matchField` | function | Whether a change of fields concerns an address, or a pattern of addresses. |

## Details

### defineTable()

Declares a table, or replaces it; `null` removes it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | The name of the table, without `/`. |
| `table` | {get: Function, set: Function}\|null | How to read and change its fields. |

### splitField()

The parts of an address.

| Parameter | Type | Description |
| --- | --- | --- |
| `address` | string | `table/record/field`. |

**Returns** `{table: string, record: string, field: string}|null` Its parts; `null` if it is not an address.

### getField()

The value of a field.

| Parameter | Type | Description |
| --- | --- | --- |
| `address` | string | `table/record/field`. |

**Returns** `string|undefined` Its value; `undefined` for an unknown table, record or field, or data not loaded yet.

### setField()

Changes a field, then emits `fieldsChanged` (after a refusal too: the components take back the value kept). The
action `data-field` calls it.

| Parameter | Type | Description |
| --- | --- | --- |
| `address` | string | `table/record/field`. |
| `value` | string | The new value. |

**Returns** `Promise<boolean>` `true` if the table accepted the change.

### fieldsChanged()

Tells that fields changed (for the table: data read again, changed elsewhere, a field changed with another).

| Parameter | Type | Description |
| --- | --- | --- |
| `table` | string | The table. |
| `record` | string | The record; none: the whole table. |
| `field` | string | The field; none: every field of the record. |

### matchField()

Whether a change of fields concerns an address, or a pattern of addresses.

- A pattern is an address where `*` stands for any part: `notes/n42/*` is every field of the note `n42`; with `*`
  in the place of the record, `label` for the field and `notes` for the table: the label of any note.
- A regular expression is tested on the whole address.
- A change without `record` (or without `field`) concerns every record (or every field): it matches any pattern of
  its table, and any regular expression (the listener reads again what it shows).

| Parameter | Type | Description |
| --- | --- | --- |
| `pattern` | string\|RegExp | The address, the pattern or the regular expression. |
| `change` | {table: string, record?: string, field?: string}\|string | The payload of `fieldsChanged`, or an address. |

**Returns** `boolean` Whether the change concerns it.
