# rc-icon-button

Module `rc-icon-button` · group `ui` · source [`src/ui/rc-icon-button.mjs`](../../src/ui/rc-icon-button.mjs)

A button made of an icon and an optional label. A click runs the actions of its `data-*` attributes (see the
`actions` module): no JavaScript is needed.

```html
<rc-icon-button icon="save" data-event="noteSave" data-param='{"id": 12}'>Save</rc-icon-button>
<rc-icon-button icon="trash" data-event="noteDelete" title="Delete the note"></rc-icon-button>
```

- **Label**: the `label` attribute, or else the text written inside the element. Without a label, only the icon
  is shown, and `title` names the button for screen readers.
- **Keyboard**: the element holds a real `<button>`: it takes the focus with `Tab`, and `Enter` or `Space` click it.
- **Look**: the button stands on the surface of its block (`--rc-surface-raised`); hover, pressed, focus and
  disabled states use the tokens of the palette (see the `theme` module). The `flat` attribute removes the
  background and the border, for dense toolbars. Shadows come from the classes of the `theme` module
  (`rc-shadow-1`, `rc-text-shadow`…).
- **Disabled**: with the `disabled` attribute, the button cannot be clicked and its actions do not run.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `icon` | in | `string` | Name of the icon in the icon set. |
| attribute | `size` | in | `number` = `20` | Size of the icon, in pixels. |
| attribute | `label` | in | `string` | Label; default: the text inside the element. |
| attribute | `title` | in | `string` | Tooltip; names the button when it has no label. |
| attribute | `disabled` | in | `boolean` | The button cannot be clicked. |
| attribute | `flat` | in | `boolean` | No background nor border. |
| attribute | `data-*` | in | `string` | Actions run by a click (see the `actions` module). |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcIconButton` | class | The component of `<rc-icon-button>`. |
