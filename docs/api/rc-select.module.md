# rc-select

Module `rc-select` · group `ui` · source [`src/ui/rc-select.mjs`](../../src/ui/rc-select.mjs)

A choice in a list: a native `<select>`, so that every browser shows its own list (a wheel on a phone). When the
user chooses an option, the actions of the `data-*` attributes run (see the `actions` module) with its value in
`data-value`.

```html
<rc-select data-item="map-size" options="Small#s|Medium#m|Large#l"></rc-select>
<rc-select data-event="layerChosen" none="None">
  <option value="roads">Roads</option>
  <option value="rivers">Rivers</option>
</rc-select>
<rc-select data-item="font" source="item font-list"></rc-select>
```

## Options

The options come from one of these, the later in the list winning:

| From | How |
| --- | --- |
| the HTML | `<option>` and `<optgroup>` elements written inside `rc-select` |
| `options` | a text: options separated by `|`, each `label` or `label#value` (the value is the label when it is not given) |
| the `options` property | an array, from JavaScript (see below) |
| `source` | a named source of options, declared by the application (see below); `source="name argument"` |

With `none="label"`, a first option is added, whose value is `''`: « no choice ».

An option given as an object: `{label, value, disabled, group}`; options with the same `group` follow one another
and are shown under that title (`<optgroup>`). A string is an option whose label is its value.

## Value

The `value` attribute gives the value; changing it later changes the choice. The choice of the user is not copied
to the attribute, as for a native `<select>`. The `value` property of the component (`element._component.value`)
reads and writes the value; it is `''` when no option is chosen. Writing the value runs no action.

The value is kept when the options change: when they arrive later (a source that loads them), the option with that
value is chosen as soon as it is there. When it is not in the list, no option is chosen, or the `none` option.

## Actions

| Use | How |
| --- | --- |
| A configuration item | `data-item="name"`: the select shows the item, and sets it. When the item changes elsewhere, the select follows. |
| An event | `data-event="name"`, with `data-param` for the payload: the event is emitted with `value` added to the payload. |
| A form | no action: the select is read with `value` and `valid`. |

With `required`, the value `''` is invalid (attribute `invalid`): no action runs. A click on the select runs nothing
(`static clickActions = false`). `data-value` is written by the select: it must not be given.

## Sources of options

An application declares its sources once, before its interface is mounted, with `defineOptionSources()`: a source
gives the options from the argument written after its name, at once or later (a `Promise`, for options loaded from a
file or a server). A source may also name the configuration items and the events after which its options must be
asked again: the select asks again by itself.

```js
import {defineOptionSources} from 'ricochet/ui/rc-select.mjs'

defineOptionSources({
  // source="groups hom-not": the groups of a sheet, asked again when the groups change
  groups: {
    options: async sheet => (await loadGroups(sheet)).map(group => ({label: group.label, value: group.id})),
    events: ['groupsChanged']
  }
})
```

| Key | Content |
| --- | --- |
| `options` | `(argument, element) => options`, or a `Promise` of options |
| `items` | the configuration items whose change asks the options again: an array, or `argument => array` |
| `events` | the events that ask the options again: an array, or `argument => array` |

A source given as a function is `{options: function}`. One source is built in: `item`, whose argument is the name of
a configuration item holding options in the format of the `options` attribute (`source="item font-list"`).

## Look

The look of the fields (see the `field-style` module), with an arrow on the right. The list itself is drawn by the
browser, in the colours of the day or of the night.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `parseOptions` | function | Reads options written as a text: options separated by `\|`, each `label` or `label#value`. |
| `defineOptionSources` | function | Declares named sources of options, used by the `source` attribute. A name declared again is replaced. |
| `RcSelect` | class | The component of `<rc-select>`. |

## Details

### parseOptions()

Reads options written as a text: options separated by `|`, each `label` or `label#value`.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The options, as in the `options` attribute. |

**Returns** `{label: string, value: string}[]` The options.

### defineOptionSources()

Declares named sources of options, used by the `source` attribute. A name declared again is replaced.

| Parameter | Type | Description |
| --- | --- | --- |
| `table` | Object<string, Function\|{options: Function, items: (string[]\|Function), events: (string[]\|Function)}> | Name → source. |

### RcSelect

The component of `<rc-select>`.
