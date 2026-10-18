# FrameLoop

Class `FrameLoop` · group `core` · source [`src/core/loop.mjs`](../../src/core/loop.mjs)

The frame loop. The application uses the `loop` instance.

## Methods

### setBudget(budget)

Sets the budget of a 60 Hz cycle, in milliseconds.

| Parameter | Type | Description |
| --- | --- | --- |
| `budget` | {update: number, render: number, microtask: number} | Budget of each phase; missing phases keep their value. |

### addAnimation(owner, update, render = null)

Registers the animation of an owner, which holds the loop until it is removed. An owner has one animation:
registering another replaces it.

| Parameter | Type | Description |
| --- | --- | --- |
| `owner` | object | The component. |
| `update` | Function\|null | Called with `(time, dt)` in the update phase of each cycle. |
| `render` | Function\|null | Called with `(time, dt)` in the render phase of each cycle. |

### removeAnimation(owner)

Removes the animation of an owner.

| Parameter | Type | Description |
| --- | --- | --- |
| `owner` | object | The component. |

### get held

`true` while a component holds the loop.

### get running

`true` while the loop runs.

### wake()

Starts the loop if it is stopped. Called when there is work to do.

### frame(time)

Runs one frame. Kernel internal: called by `requestAnimationFrame`.

| Parameter | Type | Description |
| --- | --- | --- |
| `time` | number | Timestamp of the frame. |

### stats()

State of the loop, for debugging.

**Returns** `object` `{running, held, fps, framesPerCycle, budget, last}`: `fps` is the measured refresh rate,
  `last` the durations of the last phases in milliseconds and the number of microtasks run in the last frame.
