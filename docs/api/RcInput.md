# RcInput

Class `RcInput` extends [`WComponent`](WComponent.md) · element `<rc-input>` · group `ui` · source [`src/ui/rc-input.mjs`](../../src/ui/rc-input.mjs)

The component of `<rc-input>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `value` | in | `string` | Initial value; a change replaces the content of the field. |
| attribute | `type` | in | `string` = `text` | Type of the `<input>`: `text`, `number`, `search`, `password`, `email`, `url`, `tel`. |
| attribute | `placeholder` | in | `string` | Text shown while the field is empty. |
| attribute | `maxlength` | in | `number` | Maximum number of characters. |
| attribute | `required` | in | `boolean` | An empty field is invalid. |
| attribute | `min` | in | `number` | The value is a number, not below `min`. |
| attribute | `max` | in | `number` | The value is a number, not above `max`. |
| attribute | `pattern` | in | `string` | Regular expression the whole value must match. |
| attribute | `check` | in | `string` | Named checks, separated by spaces (see `defineChecks()`). |
| attribute | `commit` | in | `string` = `input` | When the actions run: `input`, `change` or `enter`. |
| attribute | `disabled` | in | `boolean` | The field cannot be changed. |
| attribute | `readonly` | in | `boolean` | The field can be selected, not changed. |
| attribute | `label` | in | `string` | Name of the field for screen readers; the visible label is outside the field. |
| attribute | `data-item` | in | `string` | Configuration item shown and set by the field. |
| attribute | `data-*` | in | `string` | Other actions run with a valid value (see the `actions` module). |

## Methods

### get value

The value, or `null` when it is invalid.

### checkAttributeChanged()

An attribute read by a named check changed: the value is checked again.

### createField()

Creates the field. To override for another kind of field (`rc-textarea` returns a `<textarea>`).

**Returns** `HTMLInputElement|HTMLTextAreaElement` The field.

### isCommitKey(e)

Whether a key commits the value (`commit="change"` or `"enter"`). To override; the default: `Enter`.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | KeyboardEvent | The `keydown` event. |

**Returns** `boolean` True if the key commits.

### fieldUpdated()

Called each time the value is checked (typed, written, or a rule changed). To override; does nothing.

### transform(value)

Called at each keystroke: returns the value to put in the field. To override; the default keeps the value.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | string | The content of the field. |

**Returns** `string` The value to put in the field.

### validate(value)

Whether a value is valid: `required`, `min`, `max`, `pattern` and the named checks. To override, calling
`super.validate(value)` to keep these rules.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | string | The value to check. |

**Returns** `boolean` True if the value is valid.
