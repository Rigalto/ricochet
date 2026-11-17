# RcImage

Class `RcImage` extends [`WComponent`](WComponent.md) · element `<rc-image>` · group `ui` · source [`src/ui/rc-image.mjs`](../../src/ui/rc-image.mjs)

The component of `<rc-image>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `source` | in | `string` | The name of the source (`defineImageSources()`). |
| attribute | `ref` | in | `string` | The reference of the image in the source. |
| attribute | `alt` | in | `string` | The text of the image, shown when it is missing. |
| attribute | `width` | in | `string` | The width: pixels (`300`, `300px`) or a percentage of the container (`50%`). |
| attribute | `height` | in | `string` | The height, in pixels. |

## Methods

### reload()

Asks the image again: after `forgetImages()`.
