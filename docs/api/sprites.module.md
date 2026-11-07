# sprites

Module `sprites` · group `utils` · source [`src/utils/sprites.mjs`](../../src/utils/sprites.mjs)

The images of a game: loading them before the game starts, drawing one centred on a point (turned, scaled), and the
animations cut from a sheet of frames.

```javascript
import {loadImages, drawImageCentered, SpriteAnimation} from 'ricochet/ricochet-utils.mjs'

const images = await loadImages({ship: '/assets/game/ship.png', boom: '/assets/game/explosion-128x128.png'})
drawImageCentered(ctx, images.ship, x, y, {angle: 0.3})

const boom = new SpriteAnimation({image: images.boom, width: 128, height: 128, count: 21, period: 20, loop: false})
boom.update(dt)            // at each update of the game
boom.draw(ctx, x, y)       // at each render
if (boom.done) { … }       // played once
```

## A sheet of frames

The frames of an animation are side by side in one image, all of the same size, without any space: frame `i` is at
`x = i × width`. Several animations may share a sheet, one per row (`row`). The frames are shown in turn
(`count` frames), or in the order of `frames` (`[0, 1, 2, 1]`), each one during `period` milliseconds; in a loop,
or once (`loop: false`: then `done`, and nothing is drawn any more).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `loadImage` | function | Loads an image, and waits until it can be drawn. |
| `loadImages` | function | Loads several images at once. |
| `drawImageCentered` | function | Draws an image centred on a point, turned and scaled. The state of the context (transformation) is kept. |
| `SpriteAnimation` | class | An animation cut from a sheet of frames. |

## Details

### loadImage()

Loads an image, and waits until it can be drawn.

| Parameter | Type | Description |
| --- | --- | --- |
| `src` | string | The address. |

**Returns** `Promise<HTMLImageElement>` The image; rejected when it cannot be loaded.

### loadImages()

Loads several images at once.

| Parameter | Type | Description |
| --- | --- | --- |
| `sources` | Object<string, string> | `{name: address}`. |

**Returns** `Promise<Object<string, HTMLImageElement>>` `{name: image}`, once all are loaded; rejected when one cannot
  be loaded.

### drawImageCentered()

Draws an image centred on a point, turned and scaled. The state of the context (transformation) is kept.

| Parameter | Type | Description |
| --- | --- | --- |
| `ctx` | CanvasRenderingContext2D | The context. |
| `image` | CanvasImageSource | The image. |
| `x` | number | The centre. |
| `y` | number | The centre. |
| `options` | object |  |
| `options.angle` | number | The rotation, in radians, around the centre (default 0). |
| `options.width` | number | The width drawn (default: the width of the image). |
| `options.height` | number | The height drawn (default: the height of the image). |
| `options.pivotY` | number | The vertical position of the centre in the image, from 0 (top) to 1 (bottom) (default 0.5): a barrel turns around its base with `pivotY: 0.8`. |
