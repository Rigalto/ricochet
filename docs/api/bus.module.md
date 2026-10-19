# bus

Module `bus` · group `core` · source [`src/core/bus.mjs`](../../src/core/bus.mjs)

The synchronous event bus: every event of Ricochet goes through it, whether it is emitted now, deferred as a
microtask or scheduled for later (see `docs/DESIGN.md`, principles 1 to 3).

`emit()` calls the listeners of the event at once, in the order they subscribed, and returns when they are all
done. Emitting allocates nothing: each event keeps an array of listeners that is replaced, never modified, when a
listener subscribes or unsubscribes. A consequence worth knowing: a listener added during an `emit()` is not called
by that `emit()`, and a listener removed during an `emit()` is still called by it.

Components do not use this module directly: they subscribe by naming a method (`listen()` in `WController`), and
the kernel binds it and calls `on()`. Only kernel code passes functions to the bus.

```js
// in a component: the kernel subscribes the method tableRowSelectedDispatched
this.listen('tableRowSelected')
this.emit('tableRowSelected', {selected: '42'})

// in the kernel only
bus.on('tableRowSelected', fn)
bus.emit('tableRowSelected', {selected: '42'})
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `EventBus` | class | A synchronous event bus. The kernel uses the shared instance `bus`; tests create their own. |
| `bus` | const | The bus shared by the whole application. |
