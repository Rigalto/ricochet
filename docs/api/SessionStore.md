# SessionStore

Class `SessionStore` · group `core` · source [`src/core/session.mjs`](../../src/core/session.mjs)

A store of session values. The application uses the `session` instance; other instances are useful for tests.

## Methods

### constructor({storage = null, prefix = PREFIX} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {storage: Storage, prefix: string} | `storage`: the object that keeps the values, with the interface of `sessionStorage` (default: `sessionStorage`); `prefix` of the keys in the storage (default `ricochet-session-`). |

### get inMemory

Whether the values are kept in memory only, the session storage being unavailable.

### get(name, fallback = null)

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the value. |
| `fallback` | * | Returned when nothing is stored, or when the stored text is not JSON. |

**Returns** `*` The stored value (a new copy at each call), or `fallback`.

### set(name, value)

Stores a value, at once; `undefined` removes it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the value. |
| `value` | * | Any value that JSON can write. |

### remove(name)

Removes a value.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the value. |

### names()

**Returns** `string[]` The names of the stored values, in alphabetical order.
