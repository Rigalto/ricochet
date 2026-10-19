# RcSelect

Class `RcSelect` extends [`WComponent`](WComponent.md) · element `<rc-select>` · group `ui` · source [`src/ui/rc-select.mjs`](../../src/ui/rc-select.mjs)

The component of `<rc-select>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `value` | in | `string` | The value; a change changes the choice. |
| attribute | `options` | in | `string` | Options: `label` or `label#value`, separated by `\|`. |
| attribute | `source` | in | `string` | Named source of options and its argument: `name argument`. |
| attribute | `none` | in | `string` | Label of a first option whose value is `''`. |
| attribute | `required` | in | `boolean` | The value `''` is invalid. |
| attribute | `disabled` | in | `boolean` | The select cannot be changed. |
| attribute | `label` | in | `string` | Name of the select for screen readers; the visible label is outside. |
| attribute | `data-item` | in | `string` | Configuration item shown and set by the select. |
| attribute | `data-*` | in | `string` | Other actions run when the user chooses an option (see the `actions` module). |

## Methods

### get value

The value: `''` when no option is chosen.

### get options

The options, as `{label, value, disabled, group}`. A new array (or text) replaces them.

### sourceRefreshed()

An item or an event of the source: its options are asked again.
