# RcRadioGroup

Class `RcRadioGroup` extends [`WComponent`](WComponent.md) · element `<rc-radio-group>` · group `ui` · source [`src/ui/rc-radio.mjs`](../../src/ui/rc-radio.mjs)

The component of `<rc-radio-group>`: holds the value of its radios.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `value` | in | `string` | The selected value. |
| attribute | `vertical` | in | `boolean` | The radios are one under the other. |
| attribute | `disabled` | in | `boolean` | Every radio of the group is disabled. |
| attribute | `data-item` | in | `string` | Configuration item shown and set by the group. |
| attribute | `data-*` | in | `string` | Other actions run when a radio is selected by a click (see the `actions` module). |

## Methods

### get value

The selected value, `''` if none.

### acceptsClick()

Called by the delegation of the actions: they run only if the click changed the value.

**Returns** `boolean` True if the last click selected another radio.
