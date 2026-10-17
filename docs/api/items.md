# items

Module `items` · group `core` · source [`src/core/items.mjs`](../../src/core/items.mjs)

The store of configuration items, provided by the application. Items are shared, persistent key/value pairs; the
store loads them, saves them and calls their observers. Ricochet only defines the interface, so that the store can
be backed by an HTTP server today and by Google Drive tomorrow without changing the kernel.

A store is an object with four methods:

| Method | Role |
| --- | --- |
| `addObserver(items, recall)` | calls `recall({item: value, …})` now and whenever one of the items changes; returns an id |
| `removeObserver(id)` | stops that observation |
| `setItem(item, value)` | changes an item |
| `setItemIfValue(item, expected, value)` | changes an item only if its current value is `expected` |

```js
import {setItemStore} from 'ricochet/core/items.mjs'
setItemStore(myStore)
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `setItemStore` | function | Registers the store of configuration items. Called once by the application, at startup. |
| `itemStore` | function | The registered store. |

## Details

### setItemStore()

Registers the store of configuration items. Called once by the application, at startup.

| Parameter | Type | Description |
| --- | --- | --- |
| `itemStore` | object | An object with the four methods described above. |

### itemStore()

The registered store.

**Returns** `object` The store given to `setItemStore()`.
