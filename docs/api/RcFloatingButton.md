# RcFloatingButton

Class `RcFloatingButton` extends [`RcIconButton`](RcIconButton.md) · element `<rc-floating-button>` · group `ui` · source [`src/ui/rc-floating.mjs`](../../src/ui/rc-floating.mjs)

The component of `<rc-floating-button>`: a round icon button.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `icon` | in | `string` | Name of the icon. |
| attribute | `size` | in | `number` = `33` | Size of the icon, in pixels. |
| attribute | `title` | in | `string` | Tooltip; names the button. |
| attribute | `key` | in | `string` | Key that clicks the button (`Ctrl-ArrowLeft`…). |
| attribute | `disabled` | in | `boolean` | The button cannot be clicked. |
| attribute | `data-*` | in | `string` | Actions run by a click (see the `actions` module). |
