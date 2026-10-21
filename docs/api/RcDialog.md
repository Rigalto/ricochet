# RcDialog

Class `RcDialog` extends [`WComponent`](WComponent.md) · element `<rc-dialog>` · group `ui` · source [`src/ui/rc-dialog.mjs`](../../src/ui/rc-dialog.mjs)

The component of `<rc-dialog>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `open` | in | `boolean` | The window is open. |
| attribute | `label` | in | `string` | Title of the window. |
| attribute | `closedby` | in | `string` | `any`: a click outside the window closes it too, as `Escape` (the name and the value of the attribute of the native `<dialog>`); for a window of choices, not for a form that would lose its content. |
| attribute | `data-item` | in | `string` | Configuration item set to the value when the window closes. |
| attribute | `data-*` | in | `string` | Other actions run when the window closes (see the `actions` module). |

## Methods

### get value

The value of the last closing.

### dialogKeyPressed({id, key})

Internal event: `Escape` or `Enter` pressed in the window.

| Parameter | Type | Description |
| --- | --- | --- |
| `payload` | {id: string, key: string} | The dialog and the key. |
