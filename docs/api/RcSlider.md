# RcSlider

Class `RcSlider` extends [`WComponent`](WComponent.md) · element `<rc-slider>` · group `ui` · source [`src/ui/rc-slider.mjs`](../../src/ui/rc-slider.mjs)

The component of `<rc-slider>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `min` | in | `number` = `0` | Lowest value. |
| attribute | `max` | in | `number` = `100` | Highest value. |
| attribute | `step` | in | `number` = `1` | Step between two values. |
| attribute | `value` | in | `number` | The value; a change moves the thumb. |
| attribute | `unit` | in | `string` | Text shown after the value. |
| attribute | `no-value` | in | `boolean` | The value is not shown. |
| attribute | `commit` | in | `string` = `input` | When the actions run: `input` (while the thumb moves) or `change` (when it is released). |
| attribute | `disabled` | in | `boolean` | The slider cannot be moved. |
| attribute | `label` | in | `string` | Name of the slider for screen readers; the visible label is outside. |
| attribute | `data-item` | in | `string` | Configuration item shown and set by the slider. |
| attribute | `data-*` | in | `string` | Other actions run when the user moves the slider (see the `actions` module). |

## Methods

### get value

The value, as a string.
