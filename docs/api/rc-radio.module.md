# rc-radio

Module `rc-radio` · group `ui` · source [`src/ui/rc-radio.mjs`](../../src/ui/rc-radio.mjs)

Radio buttons: a group, `rc-radio-group`, holds the value; each `rc-radio` inside it offers one value. A click on a
radio selects its value, then runs the actions of the `data-*` attributes of the group (see the `actions` module),
with the new value in `data-value`.

```html
<rc-radio-group data-item="sudoku-start" value="copy">
  <rc-radio value="copy">Copy the grid</rc-radio>
  <rc-radio value="new">Generate</rc-radio>
</rc-radio-group>

<rc-radio-group data-event="mapLayer" data-param='{"map": "world"}' vertical>
  <rc-radio value="roads">Roads</rc-radio>
  <rc-radio value="rivers" disabled>Rivers</rc-radio>
</rc-radio-group>
```

## Value

The value is the `value` attribute of the group: the radio with the same `value` is checked, the others are not;
none is checked when no radio has it. Writing it in the HTML gives the initial value; changing it later changes the
selection. The group changes it itself when a radio is clicked. The `value` property of the component
(`element._component.value`) reads and writes the same value. Changing the value by the attribute or by `value` runs
no action: only a click does. A click on the radio already checked runs nothing either.

## Uses

| Use | How |
| --- | --- |
| A configuration item | `data-item="name"` on the group: the radios show the item, and a click sets it. Nothing else is needed: when the item changes elsewhere, the radios follow. An item not yet set leaves the initial value. |
| An event | `data-event="name"` on the group, with `data-param` for the payload: a click emits the event with `value` added to the payload. |
| A form | no action: the group is read with `value` (or its `value` attribute) when the form is validated. |

`data-value` is written by the group: it must not be given. The actions are written on the group, not on the
radios.

## Look

The radios look like flat `rc-icon-button`s: no background, the hover and pressed states of the palette, the focus
ring with the keyboard. The icon is `radiooff`, or `radioon` in the colour `--rc-selected` for the checked radio.
The radios of a group are side by side, wrapping on several lines when needed; the `vertical` attribute puts them
one under the other.

## Disabled

A radio with `disabled` cannot be selected; a group with `disabled` disables all its radios.

## Keyboard and screen readers

The group has `role="radiogroup"`, and each radio holds a `<button role="radio">` with `aria-checked`. `Tab` reaches
each radio, `Space` or `Enter` select it, and the arrows select the next or the previous radio of the group, skipping
the disabled ones.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcRadio` | class | The component of `<rc-radio>`: one radio button of an `rc-radio-group`. |
| `RcRadioGroup` | class | The component of `<rc-radio-group>`: holds the value of its radios. |

## Details

### RcRadio

The component of `<rc-radio>`: one radio button of an `rc-radio-group`.

### RcRadioGroup

The component of `<rc-radio-group>`: holds the value of its radios.
