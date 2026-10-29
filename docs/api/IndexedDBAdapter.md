# IndexedDBAdapter

Class `IndexedDBAdapter` · group `adapters` · source [`src/adapters/indexeddb.mjs`](../../src/adapters/indexeddb.mjs)

Storage adapter for `config`, in the local database of the browser.

## Methods

### constructor(name, defaults = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the database: one per application. |
| `defaults` | object | Values of the items that are not stored yet, as `{item: value, …}`. |

### get saveDelay

Delay before the changes are saved, in milliseconds: short, the writes in the local database being cheap. Read by
the store, in place of its own delay (2 seconds, made for a server): a change is saved before a reload, even an
early one; a write started while the page is being closed is not always completed by the browser.

### get name

The name of the database.

### get inMemory

Whether the items are kept in memory, IndexedDB being unavailable.

### async load()

**Returns** `Promise<object>` Every item, as `{item: value, …}`: the stored ones over the default values.

### async save(entries)

Stores items, in one transaction: all of them or none.

| Parameter | Type | Description |
| --- | --- | --- |
| `entries` | Array<{item: string, value: string}> | The items to store. |

### async remove(items)

Deletes items, in one transaction.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | string[] | The names of the items to delete. |

### async close()

Closes the database; it is opened again by the next call.
