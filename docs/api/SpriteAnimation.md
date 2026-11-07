# SpriteAnimation

Class `SpriteAnimation` · group `utils` · source [`src/utils/sprites.mjs`](../../src/utils/sprites.mjs)

An animation cut from a sheet of frames.

## Methods

### constructor({image, width, height, count = 1, frames = null, row = 0, period = 150, loop = true, scale = 1})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | object |  |
| `options.image` | CanvasImageSource | The sheet. |
| `options.width` | number | The width of a frame in the sheet. |
| `options.height` | number | The height of a frame in the sheet. |
| `options.count` | number | The number of frames (default 1). |
| `options.frames` | number[] | The order of the frames (default: 0 to `count - 1`). |
| `options.row` | number | The row of the animation in the sheet (default 0). |
| `options.period` | number | The time of a frame, in ms (default 150). |
| `options.loop` | boolean | In a loop (default `true`), or once. |
| `options.scale` | number | The size drawn, relative to the frame (default 1). |

### restart()

Starts again from the first frame.

### get frame

The frame shown (its number in the sheet).

### update(dt)

Advances the animation.

| Parameter | Type | Description |
| --- | --- | --- |
| `dt` | number | The time spent, in ms. |

### draw(ctx, x, y, {angle = 0} = {})

Draws the frame shown, centred on a point (nothing once a single animation is done).

| Parameter | Type | Description |
| --- | --- | --- |
| `ctx` | CanvasRenderingContext2D | The context. |
| `x` | number | The centre. |
| `y` | number | The centre. |
| `options` | {angle: number} | The rotation, in radians. |
