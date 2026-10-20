# timing

Module `timing` · group `utils` · source [`src/utils/timing.mjs`](../../src/utils/timing.mjs)

Debounce and throttle: calls that come in bursts (keys typed, a window resized, a slider dragged) turned into few
events. In Ricochet, everything is an event: these functions emit an **event**, through the scheduled tasks and
the microtasks of the kernel (see the `scheduler` and `microtasker` modules), instead of calling a function as
lodash does. The work runs in the spare time of a frame, with the priority and the cost declared for the event.

| Function | The event is emitted | Use |
| --- | --- | --- |
| `debounce(event, wait)` | once the calls have stopped for `wait` ms, with the last payload | save a text after typing, search after the last key |
| `throttle(event, wait)` | at most once every `wait` ms: at the first call, then at the end of each period if calls came | follow a drag, a scroll, a resize |

Both return a function, the **trigger**, called with the payload of the event. The trigger also has:

| Member | Role |
| --- | --- |
| `cancel()` | forgets the waiting event |
| `flush()` | emits the waiting event at once (as a microtask), instead of at its time |
| `pending` | `true` while an event waits |

```javascript
import {declareTasks} from 'ricochet/ricochet.mjs'
import {debounce, throttle} from 'ricochet/ricochet-utils.mjs'

declareTasks({noteSave: {priority: 2, cost: 1}})

class NoteEditor extends WComponent {
  attach () {
    this.elText = this.element.querySelector('textarea')
    this.save = debounce('noteSave', 1500, {owner: this}) // cancelled when the component is detached
    this.observeDom(this.elText, 'input', 'textTyped')
    this.listen('noteSave')
  }

  textTyped () { this.save({text: this.elText.value}) } // at each key

  noteSaveDispatched ({text}) { … } // 1.5 s after the last key
}
```

**Options.** `owner`: the component the waiting events belong to, cancelled when it is detached; `clock`: `'real'`
(default) or `'game'`, the clock of the delay (see the `clock` module). `throttle()` also takes `leading` (emit at
the first call, default `true`) and `trailing` (emit at the end of a period with the last payload, default `true`).

The function `promiseState(promise)` tells whether a promise is `'pending'`, `'fulfilled'` or `'rejected'`.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `debounce` | function | Emits an event once the calls have stopped for a while. |
| `throttle` | function | Emits an event at most once in a period. |
| `promiseState` | function | The state of a promise, without waiting for it. |

## Details

### debounce()

Emits an event once the calls have stopped for a while.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | The event emitted, with the payload of the last call. |
| `wait` | number | The quiet time, in milliseconds. |
| `options` | {owner: object, clock: string} | See the module. |

**Returns** `Function` The trigger: `trigger(payload)`, with `cancel()`, `flush()` and `pending`.

### throttle()

Emits an event at most once in a period.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | The event emitted. |
| `wait` | number | The period, in milliseconds. |
| `options` | {owner: object, clock: string, leading: boolean, trailing: boolean} | See the module. |

**Returns** `Function` The trigger: `trigger(payload)`, with `cancel()`, `flush()` and `pending`.

### promiseState()

The state of a promise, without waiting for it.

| Parameter | Type | Description |
| --- | --- | --- |
| `promise` | Promise | The promise. |

**Returns** `Promise<string>` `'pending'`, `'fulfilled'` or `'rejected'`.
