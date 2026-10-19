# rc-icon

Module `rc-icon` · group `ui` · source [`src/ui/rc-icon.mjs`](../../src/ui/rc-icon.mjs)

An icon of the icon set (`icons/iconset.mjs`), drawn in the colour of the text: it follows the palette of its block,
by day and by night.

```html
<rc-icon icon="save"></rc-icon>
<rc-icon icon="trash" size="32" label="Deleted"></rc-icon>
```

An icon is decorative by default: screen readers skip it. With a `label`, it is an image with that text.

An unknown icon is drawn as `add`, and reported once in the console.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `icon` | in | `string` | Name of the icon in the icon set. |
| attribute | `size` | in | `number` = `24` | Width and height, in pixels. |
| attribute | `label` | in | `string` | Text for screen readers; without it, the icon is decorative. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `iconPath` | function | The path of an icon of the icon set: `add` if the name is unknown (reported once). |
| `RcIcon` | class | The component of `<rc-icon>`. |

## Details

### iconPath()

The path of an icon of the icon set: `add` if the name is unknown (reported once).

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string\|null | Name of the icon. |

**Returns** `string` The `d` attribute of the path.
