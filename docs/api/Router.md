# Router

Class `Router` · group `core` · source [`src/core/router.mjs`](../../src/core/router.mjs)

The router. The application uses the `router` instance.

## Methods

### setResolver(resolver)

Sets the resolver of the application.

| Parameter | Type | Description |
| --- | --- | --- |
| `resolver` | Function | Called with `{path, terms}`; returns (or resolves with) a route or `{redirect}`. |

### get current

The current route, `null` before the first navigation.

### async start()

Resolves the current address, then listens to its changes. Called once by `start()`.

**Returns** `Promise<object>` The route, once applied; rejected if the first navigation fails.

### listen()

Listens to the changes of the address. `start()` calls it after the first navigation.

### stop()

Stops listening to the address.

### navigate(path)

Goes to a path: a new entry in the history, then a navigation.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | string | The path, with or without `#`. |

### async resolve({throws = false} = {})

Resolves the current address and applies the route. Called at each change of the address.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {throws: boolean} | `throws`: rejects on failure, instead of emitting `routeError` only. |

**Returns** `Promise<object|null>` The route applied, or `null` if this navigation was replaced by a newer one or
  ended with a redirect.
