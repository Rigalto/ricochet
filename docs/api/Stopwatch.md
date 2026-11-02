# Stopwatch

Class `Stopwatch` · group `core` · source [`src/core/clock.mjs`](../../src/core/clock.mjs)

The time spent on an activity, in milliseconds: real time, counted only while the page is visible. Switching to
another tab, minimising the window or locking the screen pauses it; it goes on when the page is shown again.

The elapsed time can be saved (`elapsed`) and given back to a new stopwatch (`new Stopwatch({elapsed})`), for
instance to resume a game after a reload. `onPause` is called each time the page is hidden while the stopwatch
counts, the elapsed time being up to date: the place to save it (a reload hides the page first).

```js
const stopwatch = new Stopwatch({onPause: () => save(stopwatch.elapsed)})
stopwatch.start() // the first move
const seconds = Math.round(stopwatch.elapsed / 1000)
```

## Methods

### get elapsed

The time counted, in milliseconds.

### get running

`true` between `start()` and `stop()`, even while the page is hidden.

### start()

Starts counting (nothing if already started).

### stop()

Stops counting; the elapsed time is kept.

### reset(elapsed = 0)

Stops and sets the elapsed time.

| Parameter | Type | Description |
| --- | --- | --- |
| `elapsed` | number | The new elapsed time, in milliseconds. |

### static visibilityChanged(hidden)

The page is hidden or shown again: every running stopwatch pauses or goes on. Called by the `visibilitychange`
listener of the module; kernel internal (tests call it).

| Parameter | Type | Description |
| --- | --- | --- |
| `hidden` | boolean | `true` if the page is now hidden. |
