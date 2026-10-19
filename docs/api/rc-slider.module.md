# rc-slider

Module `rc-slider` · group `ui` · source [`src/ui/rc-slider.mjs`](../../src/ui/rc-slider.mjs)

A slider: a number between two bounds, chosen by moving a thumb along a track. When the user moves it, the actions
of its `data-*` attributes run (see the `actions` module) with the value in `data-value`.

```html
<rc-slider data-item="sound-volume" min="0" max="100" step="5" unit=" %"></rc-slider>
<rc-slider data-event="zoomChanged" min="1" max="8" commit="change" label="Zoom"></rc-slider>
```

## Value

`min` (default 0), `max` (default 100) and `step` (default 1) bound the value; a value outside them is brought
back inside. The `value` attribute gives the value, and changing it later moves the thumb; the moves of the user
are not copied to it, as for a native `<input type="range">`. The `value` property of the component
(`element._component.value`) reads and writes the value, as a string. Changing the value by the attribute or by
`value` runs no action.

The value is shown on the right of the track, followed by `unit`; `no-value` hides it.

## Actions

| Use | How |
| --- | --- |
| A configuration item | `data-item="name"`: the slider shows the item, and sets it. When the item changes elsewhere, the slider follows. |
| An event | `data-event="name"`, with `data-param` for the payload: the event is emitted with `value` added to the payload. |

The `commit` attribute tells when the actions run: `input` (default) while the thumb moves, `change` when the user
releases it (or at each key that moves it). A click on the slider runs nothing else (`static clickActions =
false`).

## Keyboard and look

The slider holds a native `<input type="range">`: it takes the focus with `Tab`, and the arrows, `Page Up`,
`Page Down`, `Home` and `End` move the thumb. The part of the track before the thumb is in `--rc-selected`, the rest
mixes `--rc-border` with the surface; the thumb stands on `--rc-surface-raised`; the focus ring is `--rc-focus`.
The slider takes the width of `rc-slider`, set by the application.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcSlider` | class | The component of `<rc-slider>`. |

## Details

### RcSlider

The component of `<rc-slider>`.
