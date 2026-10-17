# EventBus

Class `EventBus` · group `core` · source [`src/core/bus.mjs`](../../src/core/bus.mjs)

A synchronous event bus. The kernel uses the shared instance `bus`; tests create their own.

## Methods

### on(name, fn)

Subscribes a function to an event. Subscribing the same function twice to the same event has no effect.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Event name, in camelCase. |
| `fn` | Function | Called with the payload of the event. |

### off(name, fn)

Unsubscribes a function from an event. Does nothing if it was not subscribed.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Event name. |
| `fn` | Function | The function given to `on()`. |

### emit(name, payload)

Calls every listener of an event, at once, in subscription order. An error thrown by a listener is reported in
the console and does not stop the other listeners.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Event name. |
| `payload` | * | Data given to the listeners. It is shared by all of them: they must not modify it. |

**Returns** `number` The number of listeners called.

### has(name)

Tells whether an event has listeners.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Event name. |

**Returns** `boolean` `true` if at least one function is subscribed.

### count(name)

Number of listeners of an event.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Event name. |

**Returns** `number` The number of subscribed functions.

### stats()

Debugging: the events that have listeners, with the names of the listeners, sorted by event name.

**Returns** `Array<{name: string, listeners: string[]}>` One entry per event.

### setTracer(fn)

Debugging: registers a function called before each `emit()`, with the event name, the payload and the number of
listeners. `null` removes it. When no tracer is set, emitting costs nothing more.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | Function\|null | Called as `fn(name, payload, listenerCount)`. |

### clear()

Removes every listener. For tests and for a full restart of the application.
