# w-controller

Module `w-controller` · group `core` · source [`src/core/w-controller.mjs`](../../src/core/w-controller.mjs)

`WController`: the base class of everything that reacts to events without owning a DOM element (keyboard, data
proxies, business logic). `WComponent` extends it for components bound to an element.

A controller subscribes to stimuli by **naming** one of its methods (principle 7 of `docs/DESIGN.md`): the kernel
binds the method once and keeps every subscription, so that `release()` — called automatically when a component is
detached — stops them all. Subscribing twice in the same way has no effect.

| Stimulus | Subscribe | Default method |
| --- | --- | --- |
| event of the bus | `listen(name)` | `<name>Dispatched(payload)` |
| configuration items | `observeItems([items])` | `itemsChanged(items)` |
| window event | `observeWindowEvents(type, method)` | — |
| DOM event | `observeDom(target, type, method)` | — |
| interval | `setInterval(method, ms)` | — |
| animation frame | `setAnimationFrame(method)` | — |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `setRenderer` | function | Kernel internal: registers the function that mounts components after an `innerHTML` (set by `w-component.mjs`). |
| `WController` | class | Base class of controllers. A controller is usually a singleton created when its module is imported. |

## Details

### setRenderer()

Kernel internal: registers the function that mounts components after an `innerHTML` (set by `w-component.mjs`).

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | Function | Called with the element whose content changed. |
