# scheduler

Module `scheduler` · group `core` · source [`src/core/scheduler.mjs`](../../src/core/scheduler.mjs)

Scheduled tasks: events due at a given time, in real time or in game time (see the `clock` module). A scheduled
task is an event name and a payload; when it is due, it becomes a microtask (see the `microtasker` module), run in
the spare time of the frame with the priority and the cost declared for its event.

- **Identifier.** A task may have an `id`, used to cancel it or to find it again; several tasks may share an id.
- **Modes.** `add` (default) adds a task; `once` adds it only if no task with the same id is waiting; `restart`
  replaces the waiting tasks with the same id; `extend` pushes back the due time of the waiting task with the same
  id by the delay (or adds it, if there is none).
- **Order.** Tasks due at the same time run in the order they were scheduled.
- **Owner.** A task scheduled by a component (`this.schedule()`) belongs to it and is cancelled when it is detached.

Real time tasks wait while the page is hidden: the browser stops the frames.

```javascript
import {schedule, cancel} from 'ricochet/core/scheduler.mjs'

schedule('noteSave', {id: 12}, 2000, {id: 'note-12', mode: 'once'})
schedule('plantGrow', {plant: 12}, 30000, {clock: 'game'})
cancel('note-12')
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `Scheduler` | class | The scheduled tasks. The application uses the `scheduler` instance. |
| `scheduler` | const | The scheduled tasks of the application. |
| `schedule` | function | Schedules an event (see `Scheduler.schedule()`). |
| `cancel` | function | Cancels waiting tasks (see `Scheduler.cancel()`). |

## Details

### schedule()

Schedules an event (see `Scheduler.schedule()`).

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the listeners. |
| `delay` | number | Delay in milliseconds. |
| `options` | object | See `Scheduler.schedule()`. |

**Returns** `number` The due time of the task.

### cancel()

Cancels waiting tasks (see `Scheduler.cancel()`).

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrRegex` | string\|RegExp | The id of the tasks, or a regular expression. |

**Returns** `number` The number of tasks cancelled.
