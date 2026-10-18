# GameClock

Class `GameClock` · group `core` · source [`src/core/clock.mjs`](../../src/core/clock.mjs)

Game time.

## Methods

### get time

The game time, in milliseconds.

### get paused

`true` while paused.

### set(time)

Sets the game time, for instance when a saved game is loaded.

| Parameter | Type | Description |
| --- | --- | --- |
| `time` | number | The game time, in milliseconds. |

### pause()

Stops the game time.

### resume()

Restarts the game time.

### advance(dt)

Advances the game time. Called by the frame loop at each cycle. Kernel internal.

| Parameter | Type | Description |
| --- | --- | --- |
| `dt` | number | Duration of the cycle, in milliseconds, already bounded by the loop. |

**Returns** `number` The duration added to the game time.
