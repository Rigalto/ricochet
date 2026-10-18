# Microtasker

Class `Microtasker` · group `core` · source [`src/core/microtasker.mjs`](../../src/core/microtasker.mjs)

A queue of microtasks. The application uses the `microtasker` instance.

## Methods

### declare(table)

Declares the priority and the cost of events run as microtasks. Called once by the module that does the work.

| Parameter | Type | Description |
| --- | --- | --- |
| `table` | object | `{event: {priority, cost}, …}`: `priority` is an integer, higher runs first; `cost` is the expected duration in milliseconds (0.25 to 5). |

### setWaker(fn)

Called by the frame loop: `fn()` is called whenever a task is queued. Kernel internal.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | Function | The function to call. |

### defer(event, payload, {once = false, owner = null} = {})

Defers an event to the spare time of the next frames.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the listeners. |
| `options` | {once: boolean, owner: object} | `once`: not queued if the same event of the same owner is already waiting; `owner`: the component the task belongs to. |

### cancelOwner(owner)

Cancels the waiting tasks of an owner. Called when a component is released.

| Parameter | Type | Description |
| --- | --- | --- |
| `owner` | object | The component. |

### run(budget, force = false)

Runs waiting tasks within a budget. Kernel internal: called by the frame loop.

| Parameter | Type | Description |
| --- | --- | --- |
| `budget` | number | Time available, in milliseconds. |
| `force` | boolean | Runs the task of highest priority even if its cost exceeds the budget. |

**Returns** `number` The number of tasks run.

### get size

Number of waiting tasks.

### list()

The waiting tasks, the next to run first.

**Returns** `string[]` One line per task: event, priority and cost.

### stats()

Durations measured for each event, to tune the declared costs: count, mean, maximum, and a histogram of
half-millisecond bins (the last bin counts 5 ms and more).

**Returns** `object` `{event: {count, mean, max, histogram, cost}, …}`; `cost` is the declared cost.

### resetStats()

Forgets the measured durations.

### clear()

Removes every waiting task.
