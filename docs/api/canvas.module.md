# canvas

Module `canvas` · group `utils` · source [`src/utils/canvas.mjs`](../../src/utils/canvas.mjs)

A canvas with a fixed logical size (a game of 1200 × 600, say), scaled by CSS to the width of its container, and
sharp on a high density screen; and the conversion of a pointer event into logical coordinates.

```javascript
import {setupCanvas, canvasPoint} from 'ricochet/ricochet-utils.mjs'

const view = setupCanvas(element, 1200, 600)    // element: a <canvas>
view.reset()                                       // at each frame: logical coordinates, cleared
view.ctx.drawImage(image, 100, 50)                 // the native context, in logical pixels
element.addEventListener('pointerdown', e => {
  const {x, y} = canvasPoint(element, e, 1200, 600) // logical coordinates, whatever the scale
})
```

The game draws with the native 2D context: no wrapper, the methods of the browser are the reference.

## The size

- **Logical size**: the coordinates of the game (`width` × `height`). The drawing does not depend on the size of the
  screen.
- **Size on the screen**: CSS. `setupCanvas()` gives the canvas `width: 100%`, `height: auto` and the
  `aspect-ratio` of the logical size: it fills its container and keeps its proportions. A `max-width` given by
  the application keeps it from growing beyond its logical size.
- **Sharpness**: the bitmap of the canvas has `width × ratio` pixels (`ratio`: `devicePixelRatio` by default,
  bounded to 2); `reset()` sets the scale, so that the game keeps drawing in logical pixels.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `setupCanvas` | function | Prepares a canvas for a fixed logical size. |
| `canvasPoint` | function | The logical coordinates of a pointer event (or of any `{clientX, clientY}`) on a canvas, whatever its size on the screen. |

## Details

### setupCanvas()

Prepares a canvas for a fixed logical size.

| Parameter | Type | Description |
| --- | --- | --- |
| `canvas` | HTMLCanvasElement | The canvas. |
| `width` | number | The logical width. |
| `height` | number | The logical height. |
| `options` | object |  |
| `options.ratio` | number | Bitmap pixels per logical pixel (default: `devicePixelRatio`, between 1 and 2). |
| `options.alpha` | boolean | A transparent canvas (default `true`: the CSS background shows through). |
| `options.smoothing` | boolean | The smoothing of the images (default `true`; `false` for pixel art). |

**Returns** `{ctx: CanvasRenderingContext2D, width: number, height: number, ratio: number, reset: Function}` The 2D
  context, the logical size, the ratio, and `reset(fill)`: back to logical coordinates (no rotation, no
  translation), the whole canvas cleared, or filled with the colour `fill`.

### canvasPoint()

The logical coordinates of a pointer event (or of any `{clientX, clientY}`) on a canvas, whatever its size on the
screen.

| Parameter | Type | Description |
| --- | --- | --- |
| `canvas` | HTMLCanvasElement | The canvas. |
| `event` | {clientX: number, clientY: number} | The event. |
| `width` | number | The logical width. |
| `height` | number | The logical height. |

**Returns** `{x: number, y: number, inside: boolean}` The coordinates, and whether the point is on the canvas.
