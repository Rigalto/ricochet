# rc-combobox

Module `rc-combobox` · group `ui` · source [`src/ui/rc-combobox.mjs`](../../src/ui/rc-combobox.mjs)

A field of free text with suggestions: the user chooses a value of the list, or types a new one. It is an
`rc-input` whose suggestions are shown by the browser (a native `<datalist>`): the same value, actions, validation
and look (see the `rc-input` module). It suits a value taken from a list that grows with use: the groups of a list
of notes, the terms of a category.

```html
<rc-combobox options="Kitchen|Garden|Garage" data-event="noteGroup" data-param='{"id": "ab"}'></rc-combobox>
<rc-combobox source="groups hom-not" required placeholder="Group"></rc-combobox>
<rc-combobox data-item="last-author" source="item author-list"></rc-combobox>
```

## Suggestions

The suggestions come from the same places as the options of `rc-select` (see the `rc-select` module), the later in
the list winning:

| From | How |
| --- | --- |
| the HTML | `<option>` elements written inside `rc-combobox` |
| `options` | a text: suggestions separated by `\|`, each `value` or `label#value` |
| the `options` property | an array of strings or of `{label, value}`, from JavaScript |
| `source` | a named source, declared with `defineOptionSources()` of `rc-select`; `source="name argument"` |

A source is asked again after its configuration items and its events, as for `rc-select`; several fields that ask
the same source and argument at the same time get one answer.

The browser shows the suggestions that match what is typed, as it wishes: some keep the values that start with it,
others those that contain it; on a phone, they are shown above the keyboard. A suggestion with a `label` shows it
beside the value, where the browser does. The list itself cannot be styled.

## Value

As for `rc-input`: the `value` attribute and the `value` property write the value, with no action; the property
reads it (`null` when it is invalid). The value is not limited to the suggestions.

## Actions

As for `rc-input` (`data-item`, `data-event`, a form), but `commit` is `change` by default: the actions run when the
field is left or `Enter` is pressed, not at each keystroke. `commit="enter"` and `commit="input"` remain possible.

## Clean values

When the field is left or `Enter` is pressed, before the actions, the typed value is cleaned by `normalize()`: the
spaces at both ends are removed, the spaces inside are reduced to one, and a value that differs from a suggestion
only by its case takes the spelling of the suggestion (`kitchen` becomes `Kitchen`). A subclass changes this rule
by overriding `normalize(value)`. A value written by the application is not cleaned.

## Look

The look of the fields (see the `field-style` module). Some browsers add an arrow on the right of a field with
suggestions.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcCombobox` | class | The component of `<rc-combobox>`: the attributes of `rc-input`, and the ones below. |

## Details

### RcCombobox

The component of `<rc-combobox>`: the attributes of `rc-input`, and the ones below.
