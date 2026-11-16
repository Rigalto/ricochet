# RcCombobox

Class `RcCombobox` extends [`RcInput`](RcInput.md) · element `<rc-combobox>` · group `ui` · source [`src/ui/rc-combobox.mjs`](../../src/ui/rc-combobox.mjs)

The component of `<rc-combobox>`: the attributes of `rc-input`, and the ones below.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `options` | in | `string` | Suggestions: `value` or `label#value`, separated by `\|`. |
| attribute | `source` | in | `string` | Named source of suggestions and its argument: `name argument`. |
| attribute | `commit` | in | `string` = `change` | When the actions run: `change`, `enter` or `input`. |

## Methods

### get options

The suggestions, as `{label, value}`. A new array (or text) replaces them.

### sourceRefreshed()

An item or an event of the source: its suggestions are asked again.

### normalize(value)

Cleans a typed value, when the field is left or `Enter` is pressed. To override; the default removes the spaces
at both ends, reduces the spaces inside to one, and gives a value that differs from a suggestion only by its case
the spelling of the suggestion.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | string | The content of the field. |

**Returns** `string` The value to keep.
