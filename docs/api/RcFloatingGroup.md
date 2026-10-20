# RcFloatingGroup

Class `RcFloatingGroup` extends [`WComponent`](WComponent.md) · element `<rc-floating-group>` · group `ui` · source [`src/ui/rc-floating.mjs`](../../src/ui/rc-floating.mjs)

The component of `<rc-floating-group>`: floating buttons side by side, with their keys and their colours.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `name` | in | `string` | Name of the group of floating keys (see the `keyboard` module); default: a name of its own. |
| attribute | `side` | in | `string` = `left` | `left` or `right`: the side of the line. |
| attribute | `gradient` | in | `string` | `right`: each button darker than the one on its left; `left`: than the one on its right. |
| attribute | `size` | in | `number` | Size of the icons of its buttons, in pixels; default: that of the bar, else 33. |
