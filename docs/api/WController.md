# WController

Class `WController` · group `core` · source [`src/core/w-controller.mjs`](../../src/core/w-controller.mjs)

Base class of controllers. A controller is usually a singleton created when its module is imported.

## Methods

### listen(event, handlerName)

Subscribes a method to an event of the bus, or to each event of an array. The method receives the payload.
A method subscribed to `routeChanged` also receives the current route at the end of the current task.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string\|string[] | Event name (camelCase), or an array of names. |
| `handlerName` | string | Method name. Default: `<event>Dispatched`. |

### unlisten(event, handlerName)

Unsubscribes a method from an event. Not needed before a component is detached: it is done automatically.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string\|string[] | Event name, or an array of names. |
| `handlerName` | string | Method name. Default: `<event>Dispatched`. |

### unlistenAll()

Unsubscribes every method of the instance from the bus.

### static emit(event, payload)

Emits an event on the bus: every subscriber is called at once.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the subscribers. |

### emit(event, payload)

Emits an event on the bus. See `WController.emit()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the subscribers. |

### observeEvents(event, handlerName)

> **Deprecated.** Use `listen()`: the method receives `{type, detail}` instead of the payload.

### unobserveEvents(event, handlerName)

> **Deprecated.** Use `unlisten()`.

### unobserveAllEvents()

> **Deprecated.** Use `unlistenAll()`.

### static dispatchEvent(event, detail = {})

> **Deprecated.** Use `WController.emit()`.

### dispatchEvent(event, detail = {})

> **Deprecated.** Use `emit()`.

### observeWindowEvents(type, handlerName)

Subscribes a method to an event of `window` (`resize`, `hashchange`…). It receives the DOM event.

| Parameter | Type | Description |
| --- | --- | --- |
| `type` | string | Event type. |
| `handlerName` | string | Method name. |

### unobserveWindowEvents(type, handlerName)

Unsubscribes a method from an event of `window`.

| Parameter | Type | Description |
| --- | --- | --- |
| `type` | string | Event type. |
| `handlerName` | string | Method name. |

### unobserveAllWindowEvents()

Unsubscribes every method of the instance from the events of `window`.

### observeDom(target, type, handlerName, options)

Subscribes a method to an event of a DOM element (`click`, `input`…). It receives the DOM event. Unlike a bare
`addEventListener`, the subscription is removed when the component is detached.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | EventTarget | Element (or document) to listen to. |
| `type` | string | Event type. |
| `handlerName` | string | Method name. |
| `options` | object | Options of `addEventListener` (`capture`, `passive`…). |

### unobserveDom(target, type, handlerName)

Unsubscribes a method from an event of a DOM element.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | EventTarget | The element given to `observeDom()`. |
| `type` | string | Event type. |
| `handlerName` | string | Method name. |

### unobserveAllDom()

Unsubscribes every method of the instance from DOM events.

### observeItems(items, handlerName = 'itemsChanged')

Observes configuration items: the method is called now with their current values, then whenever one of them
changes, with an object `{item: value, …}`. A `$` in an item name is replaced according to the current route.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | string\|string[] |  | Item name, or an array of names. |
| `handlerName` | string | `itemsChanged` | Method name. |

### unobserveItems()

Stops every observation of configuration items made by the instance.

### static setItem(item, value)

Changes a configuration item.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name. |
| `value` | string | New value. |

### setItem(item, value)

Changes a configuration item. See `WController.setItem()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name. |
| `value` | string | New value. |

### static setItems(items)

Changes several configuration items.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | Array<{item: string, value: string}> | The items and their new values. |

### setItems(items)

Changes several configuration items. See `WController.setItems()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | Array<{item: string, value: string}> | The items and their new values. |

### static setItemIfValue(item, expected, value)

Changes a configuration item only if its current value is `expected`.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name. |
| `expected` | string | Value the item must have. |
| `value` | string | New value. |

### setInterval(handlerName, delay)

> **Deprecated.** Use `schedule()`: the handler of the event schedules the next one.

Calls a method at a regular interval, until `clearInterval()` or the detachment of the component. Calling it
again with the same method restarts the interval with the new delay. The calls are scheduled tasks in real time
(see the `scheduler` module): they run in the spare time of the frames, and wait while the page is hidden.

| Parameter | Type | Description |
| --- | --- | --- |
| `handlerName` | string | Method name. |
| `delay` | number | Interval in milliseconds. |

### clearInterval(handlerName)

> **Deprecated.** Use `cancel()` with the id of the scheduled task.

Stops the interval of a method.

| Parameter | Type | Description |
| --- | --- | --- |
| `handlerName` | string | Method name. |

### clearAllIntervals()

Stops every interval of the instance.

### setAnimationFrame(updateName, renderName)

Calls methods at every cycle of the frame loop (see the `loop` module), with `(time, dt)`: `time` is the
timestamp of the frame, `dt` the duration of the cycle in milliseconds. The first method runs in the update phase,
the second, if given, in the render phase. One animation per instance: naming other methods replaces it, `null`
stops it. The animation holds the loop, which makes the game clock advance, until `unsetAnimationFrame()` or the
detachment of the component.

| Parameter | Type | Description |
| --- | --- | --- |
| `updateName` | string\|null | Method of the update phase, or `null` to stop. |
| `renderName` | string | Method of the render phase. |

### unsetAnimationFrame()

Stops the animation of the instance.

### defer(event, payload, {once = false} = {})

Defers an event to the spare time of the next frames (a microtask, see the `microtasker` module). The task
belongs to the instance: it is cancelled by `release()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the listeners. |
| `options` | {once: boolean} | `once`: not deferred if this instance already deferred the event and it has not run yet. |

### schedule(event, payload, delay, options = {})

Schedules an event (a scheduled task, see the `scheduler` module). The task belongs to the instance: it is
cancelled by `release()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `event` | string | Event name. |
| `payload` | * | Data given to the listeners. |
| `delay` | number | Delay in milliseconds. |
| `options` | {id: string, clock: string, mode: string, at: number} | See `Scheduler.schedule()`. |

**Returns** `number` The due time of the task.

### cancel(idOrRegex)

Cancels scheduled tasks of the instance.

| Parameter | Type | Description |
| --- | --- | --- |
| `idOrRegex` | string\|RegExp | The id of the tasks, or a regular expression matched against the ids. |

**Returns** `number` The number of tasks cancelled.

### getKeyboard()

Physical codes of the keys held down (`KeyA`, `ShiftLeft`…).

**Returns** `Set<string>` The codes.

### getKeys()

Characters of the keys held down.

**Returns** `Set<string>` The characters.

### elementInnerHTML(element, html)

Replaces the content of an element, then mounts the components it holds.

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | Element | The element. |
| `html` | string | Its new content. |

### release()

Stops every subscription, timer, animation and task of the instance. Called automatically when a component is
detached; a controller that is discarded must call it.
