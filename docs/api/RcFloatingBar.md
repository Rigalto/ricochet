# RcFloatingBar

Class `RcFloatingBar` extends [`WComponent`](WComponent.md) · element `<rc-floating-bar>` · group `ui` · source [`src/ui/rc-floating.mjs`](../../src/ui/rc-floating.mjs)

The component of `<rc-floating-bar>`: the line of the floating buttons, at the end of the view.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `size` | in | `number` = `33` | Size of the icons of every button, in pixels: a button measures 5/3 of it, the space between buttons 2/3, the margin below the bar 1/3. |
| event | `overlayChanged` | in | `{open: number}` | The bar is hidden while a window is open. |
