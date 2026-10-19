# rc-checkbox

Module `rc-checkbox` · group `ui` · source [`src/ui/rc-checkbox.mjs`](../../src/ui/rc-checkbox.mjs)

A checkbox: an `rc-icon-button` whose icon shows a state, checked or not. A click changes the state, then runs the
actions of its `data-*` attributes (see the `actions` module) with the new value, `yes` or `no`, in `data-value`.

```html
<rc-checkbox data-item="board-grid">Grid</rc-checkbox>
<rc-checkbox data-event="layerShow" data-param='{"layer": "roads"}' checked>Roads</rc-checkbox>
<rc-checkbox name="loop" title="Play in a loop"></rc-checkbox>
```

## State

The state is the `checked` attribute: present when the box is checked. Writing it in the HTML gives the initial
state; adding or removing it later changes the state. The checkbox adds and removes it itself when it is clicked.
The `value` property of the component (`element._component.value`) reads and writes the same state as `yes` or
`no`. Changing the state by the attribute or by `value` runs no action: only a click does.

## Uses

| Use | How |
| --- | --- |
| A configuration item | `data-item="name"`: the box shows the item, and a click sets it to `yes` or `no`. Nothing else is needed: when the item changes elsewhere, the box follows. An item not yet set leaves the initial state. |
| An event | `data-event="name"`, with `data-param` for the payload: a click emits the event with `value` added to the payload. |
| A form | no action: the box is read with `value` (or the `checked` attribute) when the form is validated. |

`data-value` is written by the checkbox: it must not be given.

## Look

Like a flat `rc-icon-button`: no background, the hover and pressed states of the palette, the focus ring with the
keyboard. The icon is `square`, or `checksquare` in the colour `--rc-selected` when the box is checked.

## Keyboard and screen readers

The checkbox holds a `<button role="checkbox">` with `aria-checked`: it takes the focus with `Tab`, and `Space` or
`Enter` change its state.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `checked` | in | `boolean` | The box is checked. |
| attribute | `size` | in | `number` = `20` | Size of the icon, in pixels. |
| attribute | `label` | in | `string` | Label; default: the text inside the element. |
| attribute | `title` | in | `string` | Tooltip; names the checkbox when it has no label. |
| attribute | `disabled` | in | `boolean` | The state cannot be changed, and the actions do not run. |
| attribute | `data-item` | in | `string` | Configuration item shown and set by the box (`yes` or `no`). |
| attribute | `data-*` | in | `string` | Other actions run by a click (see the `actions` module). |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcCheckbox` | class | The component of `<rc-checkbox>`. |
