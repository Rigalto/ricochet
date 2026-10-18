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

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `realClock` | const | Real time. |
| `GameClock` | class | Game time. |
| `gameClock` | const | The game clock of the application. |
