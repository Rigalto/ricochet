# Scheduler

Class `Scheduler` · group `core` · source [`src/core/scheduler.mjs`](../../src/core/scheduler.mjs)

The scheduled tasks. The application uses the `scheduler` instance.

## Methods

### constructor({clocks = {real: realClock, game: gameClock}, microtasker: tasks = microtasker} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {clocks: object, microtasker: object} | The clocks (`{real, game}`, objects with a `time`) and the microtask queue; default: those of the kernel. |

### setWaker(fn)

Called by the frame loop: `fn()` is called whenever a task is scheduled. Kernel internal.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | Function | The function to call. |

### schedule(event, payload, delay, {id = null, clock = 'real', mode = 'add', at, owner = null} = {})

Schedules an event.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the listeners. |
| `delay` | number | Delay in milliseconds, from now. |
| `options` | {id: string, clock: string, mode: string, at: number, owner: object} | `id` of the task; `clock`: `'real'` (default) or `'game'`; `mode`: `'add'` (default), `'once'`, `'restart'` or `'extend'`; `at`: due time in that clock, instead of the delay; `owner`: the component the task belongs to. |

**Returns** `number` The due time of the task, in the clock of the task.

### cancel(idOrRegex, owner)

Cancels waiting tasks.

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrRegex` | string\|RegExp | The id of the tasks, or a regular expression matched against the ids. |
| `owner` | object | Only the tasks of this owner. |

**Returns** `number` The number of tasks cancelled.

### cancelOwner(owner)

Cancels the waiting tasks of an owner. Called when a component is released.

| Parameter | Type | Description |
| --- | --- | --- |
| `owner` | object | The component. |

### dueTime(idOrRegex)

Due time of the first waiting task with an id.

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrRegex` | string\|RegExp | The id, or a regular expression matched against the ids. |

**Returns** `number|null` The due time, in the clock of the task, or `null` if no task waits.

### has(idOrRegex)

`true` if a task with this id waits.

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrRegex` | string\|RegExp | The id, or a regular expression matched against the ids. |

**Returns** `boolean` Whether such a task waits.

### update(game = false)

Turns the tasks that are due into microtasks. Kernel internal: called by the frame loop at each cycle.

| Parameter | Type | Description |
| --- | --- | --- |
| `game` | boolean | Also the tasks in game time (only while a game holds the loop). |

**Returns** `number` The number of tasks that were due.

### nextRealTime()

Due time of the next real time task, to wake the frame loop. Kernel internal.

**Returns** `number|null` The due time, or `null` if no task waits.

### size(clock)

Number of waiting tasks.

| Parameter | Type | Description |
| --- | --- | --- |
| `clock` | string | `'real'` or `'game'`; both by default. |

**Returns** `number` The number of tasks.

### list()

The waiting tasks, the next due first.

**Returns** `string[]` One line per task: id, event, clock and time left.

### clear()

Removes every waiting task.
