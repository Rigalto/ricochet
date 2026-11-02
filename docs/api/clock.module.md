# clock

Module `clock` · group `core` · source [`src/core/clock.mjs`](../../src/core/clock.mjs)

The two clocks of the kernel, in milliseconds.

- **Real time** (`realClock`): the time of the computer, `performance.now()`.
- **Game time** (`gameClock`): advances only while the frame loop runs for a game (a component holds it with
  `setAnimationFrame()`), by the duration of each cycle multiplied by `scale`. It stops while paused, and while the
  page is hidden. The frame loop bounds the step: after a pause of more than a second (computer asleep, page
  hidden), the clock advances by one cycle only; a slow cycle counts for 65 ms at most, so that a game slows down
  instead of jumping.

A calendar (days, hours, weather) belongs to the game: it reads `gameClock.time`.

A game without a frame loop (a puzzle, a word game) measures the time spent playing with a `Stopwatch`: it counts
real time, but only while the page is visible.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `realClock` | const | Real time. |
| `GameClock` | class | Game time. |
| `gameClock` | const | The game clock of the application. |
| `Stopwatch` | class | The time spent on an activity, in milliseconds: real time, counted only while the page is visible. Switching to another tab, minimising the window or locking the screen pauses it; it goes on when the page is shown again. |

## Details

### Stopwatch

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
