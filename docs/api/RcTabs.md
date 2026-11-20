# RcTabs

Class `RcTabs` extends [`WComponent`](WComponent.md) · element `<rc-tabs>` · group `ui` · source [`src/ui/rc-tabs.mjs`](../../src/ui/rc-tabs.mjs)

The component of `<rc-tabs>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `value` | in | `string` | Value of the tab shown. |
| attribute | `data-item` | in | `string` | Configuration item that keeps the tab shown. |
| attribute | `data-field` | in | `string` | Field of a record (`table/record/field`, see the `fields` module) that keeps the tab shown. |
| attribute | `data-*` | in | `string` | Other actions run when the user shows a tab (see the `actions` module). |

## Methods

### get value

The value of the tab shown, `''` if there is no tab.

### keptChanged(value)

The value kept in the item (`data-item`) or the field (`data-field`) changed: its tab is shown. Not set yet: the
tab shown stays.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | string\|undefined\|null | The value kept. |

### acceptsClick()

Called by the delegation of the actions: they run only if the click showed another tab.

**Returns** `boolean` True if the last click showed another tab.
