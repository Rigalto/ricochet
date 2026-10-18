# loop

Module `loop` · group `core` · source [`src/core/loop.mjs`](../../src/core/loop.mjs)

The frame loop: one `requestAnimationFrame` loop for the whole page, that runs only when something needs it.

## Cycles of 60 Hz

The work is organised in **cycles of 1/60 s**, whatever the refresh rate of the screen, with a budget in
milliseconds tuned for that rate: 3 ms for `update`, 4 ms for `render`, 5 ms for microtasks (`setBudget()`). The
costs of the microtasks are measured on the computer the application is tuned on, so the budget does not shrink on
a faster screen.

- **60 Hz screen**: each frame is a cycle: clocks and scheduled tasks, `update`, `render`, then microtasks in the
  time left.
- **120 Hz screen**: a cycle spans two frames: the first runs `update` and microtasks, the second `render` and
  microtasks. Games are drawn at 60 Hz, and the microtasks get the same time as at 60 Hz.
- **Faster screens**: a cycle spans as many frames as fit in 1/60 s; the frames after `render` run microtasks only.

The refresh rate is measured continuously. Each frame gets a share of the budget proportional to its duration.

## When it runs

The loop runs while a component holds it with `setAnimationFrame()`, or while microtasks are waiting. Otherwise it
stops, and wakes up when a microtask is deferred or when the next real time task is due. The game clock advances
only while a component holds the loop.

## Animations

`addAnimation(owner, update, render)` registers two functions, called with `(time, dt)` at each cycle: `time` is
the timestamp of the frame, `dt` the duration of the cycle in milliseconds, bounded to 65 ms (one cycle after a
pause of more than a second). Components use `setAnimationFrame()` instead.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `FrameLoop` | class | The frame loop. The application uses the `loop` instance. |
| `loop` | const | The frame loop of the application. |
