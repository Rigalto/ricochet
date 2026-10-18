# microtasker

Module `microtasker` · group `core` · source [`src/core/microtasker.mjs`](../../src/core/microtasker.mjs)

Microtasks: events deferred to the spare time of the frames. A microtask is an event name and a payload; when it
runs, the event is emitted on the bus and its listeners do the work.

- **Priority and cost.** The module that does the work declares, once, the priority and the cost of its events
  with `declareTasks()`. The cost is an estimate of the duration of the work, in milliseconds, with a resolution of
  a quarter of a millisecond, measured on the computer the application is tuned on (see `stats()`).
- **Budget.** At each frame, the frame loop gives the time left to `run()`: the task of highest priority runs at
  the start of each cycle whatever its cost, then the tasks of highest priority whose cost fits in the time left.
  Tasks of the same priority and cost run in the order they were deferred.
- **Owner.** A task deferred by a component (`this.defer()`) belongs to it and is cancelled when it is detached.

```javascript
import {declareTasks, defer} from 'ricochet/core/microtasker.mjs'

declareTasks({tileUpdate: {priority: 5, cost: 0.5}})
defer('tileUpdate', {x: 3, y: 4})
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `Microtasker` | class | A queue of microtasks. The application uses the `microtasker` instance. |
| `microtasker` | const | The microtask queue of the application. |
| `declareTasks` | function | Declares the priority and the cost of events run as microtasks (see `Microtasker.declare()`). |
| `defer` | function | Defers an event to the spare time of the next frames (see `Microtasker.defer()`). |

## Details

### declareTasks()

Declares the priority and the cost of events run as microtasks (see `Microtasker.declare()`).

| Parameter | Type | Description |
| --- | --- | --- |
| `table` | object | `{event: {priority, cost}, …}`. |

### defer()

Defers an event to the spare time of the next frames (see `Microtasker.defer()`).

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the listeners. |
| `options` | {once: boolean, owner: object} | See `Microtasker.defer()`. |
