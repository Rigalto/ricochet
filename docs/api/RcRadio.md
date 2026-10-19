# RcRadio

Class `RcRadio` extends [`RcIconButton`](RcIconButton.md) · element `<rc-radio>` · group `ui` · source [`src/ui/rc-radio.mjs`](../../src/ui/rc-radio.mjs)

The component of `<rc-radio>`: one radio button of an `rc-radio-group`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `value` | in | `string` | The value the radio offers; default: its label. |
| attribute | `label` | in | `string` | Label; default: the text inside the element. |
| attribute | `title` | in | `string` | Tooltip; names the radio when it has no label. |
| attribute | `size` | in | `number` = `20` | Size of the icon, in pixels. |
| attribute | `disabled` | in | `boolean` | The radio cannot be selected. |
| attribute | `checked` | in | `boolean` | Set by the group: the radio is the selected one. |
