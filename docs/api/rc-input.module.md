# rc-input

Module `rc-input` · group `ui` · source [`src/ui/rc-input.mjs`](../../src/ui/rc-input.mjs)

A one-line input field. When its value is valid, it runs the actions of its `data-*` attributes (see the `actions`
module) with the value in `data-value`: at each keystroke, when the field is left, or when `Enter` is pressed.

```html
<rc-input data-item="board-width" required min="8" max="64" placeholder="From 8 to 64"></rc-input>
<rc-input type="search" commit="enter" data-event="helpSearch" placeholder="Searched term"></rc-input>
<rc-input check="float" data-event="speedChanged" data-param='{"axis": "x"}'></rc-input>
```

## Value

The `value` attribute gives the initial value; changing it later replaces the content of the field. What is typed
is not copied to the attribute, as for a native `<input>`. The `value` property of the component
(`element._component.value`) reads the value (`null` when it is invalid) and writes it; `valid` tells whether it is
valid. Writing the value, by the attribute or by the property, runs no action.

## Actions

| Use | How |
| --- | --- |
| A configuration item | `data-item="name"`: the field shows the item, and sets it. When the item changes elsewhere, the field follows. |
| An event | `data-event="name"`, with `data-param` for the payload: the event is emitted with `value` added to the payload. |
| A form | no action: the field is read with `value` and `valid` when the form is validated. |

The `commit` attribute tells when the actions run, always for a valid value only:

| `commit` | Actions run |
| --- | --- |
| `input` (default) | at each keystroke |
| `change` | when the field is left or `Enter` is pressed, if the value changed |
| `enter` | when `Enter` is pressed |

A click in the field runs nothing (`static clickActions = false`). `data-value` is written by the field: it must not
be given.

## Validation

An empty field is valid unless it has `required`. A value that is not empty must pass every rule:

| Attribute | Rule |
| --- | --- |
| `min`, `max` | the value is a number, not below `min`, not above `max` |
| `pattern` | the value matches the regular expression, as a whole (as in HTML) |
| `check` | the value passes the named checks, separated by spaces |

An invalid field has the `invalid` attribute (and `aria-invalid` on its `<input>`): its border takes the colour
`--rc-danger`. The rules are checked again when one of these attributes changes.

## Named checks

The application declares its checks once, with `defineChecks()`: a regular expression, a function
`(value, element) => boolean`, or `{test, attributes}` when the check reads attributes of the field, so that the
field is checked again when they change.

```js
import {defineChecks} from 'ricochet/ui/rc-input.mjs'

defineChecks({
  float: /^[+-]?((\d+\.?\d*)|(\.\d+))$/,
  even: value => Number(value) % 2 === 0,
  notIn: {test: (value, element) => !element.getAttribute('exclude').split('|').includes(value), attributes: ['exclude']}
})
```

A check not declared is reported once in the console, and ignored.

## Extending the field

A subclass changes the behaviour with these methods, and is defined with its own tag:

- `transform(value)`: called at each keystroke; returns the value to put in the field (a shortcut typed by the user
  replaced by its value, for instance).
- `validate(value)`: returns whether the value is valid; call `super.validate(value)` to keep the rules above.
- `createField()`, `isCommitKey(e)`, `fieldUpdated()`: another kind of field, another key to commit, a call each
  time the value is checked (`rc-textarea` uses them).

```js
class DateInput extends RcInput {
  transform (value) { return value === '-' ? today() : value }
  validate (value) { return super.validate(value) && isDate(value) }
}
WComponent.define('app-date-input', DateInput)
```

## Look

The field (see the `field-style` module) stands on the surface of its block (`--rc-surface-raised`), with the border `--rc-border`, the focus ring
`--rc-focus`, the placeholder in `--rc-text-faint`, and the disabled tokens. It takes the width of `rc-input`, set by
the application; without one, the width of the browser.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `defineChecks` | function | Declares named checks, used by the `check` attribute of the fields. A name declared again is replaced. |
| `RcInput` | class | The component of `<rc-input>`. |

## Details

### defineChecks()

Declares named checks, used by the `check` attribute of the fields. A name declared again is replaced.

| Parameter | Type | Description |
| --- | --- | --- |
| `table` | Object<string, RegExp\|Function\|{test: RegExp\|Function, attributes: string[]}> | Name → check: a regular expression, a function `(value, element) => boolean`, or an object with the attributes the check reads. |

### RcInput

The component of `<rc-input>`.
