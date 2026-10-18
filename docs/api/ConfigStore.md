# ConfigStore

Class `ConfigStore` · group `core` · source [`src/core/config.mjs`](../../src/core/config.mjs)

A store of configuration items. The application uses the `config` instance; other instances are useful for tests.

## Methods

### constructor({name = 'config', saveDelay = SAVE_DELAY, retryDelay = RETRY_DELAY} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {name: string, saveDelay: number, retryDelay: number} | `name` of the store (default `config`), which names its save task (`configSave`); delays in milliseconds before saving changes (default 2000) and before saving them again after a failure (default 30000). |

### setAdapter(adapter)

Sets the adapter that loads and saves the items.

| Parameter | Type | Description |
| --- | --- | --- |
| `adapter` | object | An object with `load()`, `save(entries, options)` and `remove(items)`. |

### async load()

Loads every item from the adapter, then calls every observer. Pending changes are saved first. Items cannot be
changed while they load.

**Returns** `Promise<void>` Resolved once the items are loaded; rejected with the error of the adapter.

### async save(options = {})

Saves the pending changes now, without waiting for the delay.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {keepalive: boolean} | Passed to the adapter; `keepalive` when the page is being closed. |

**Returns** `Promise<boolean>` `true` if every change is saved, `false` if the adapter failed (the changes stay
  pending and are saved again later).

### get(item)

Current value of an item.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name; `$` stands for the scope. |

**Returns** `string|undefined` The value, or `undefined` if the item does not exist or the items are not loaded.

### keys()

Names of every item.

**Returns** `string[]` The names, in no particular order; empty while the items are not loaded.

### get loaded

`true` once the items are loaded.

### setScope(scope)

Sets the string that replaces `$` in item names. The observers of items holding `$` are called if their values
change.

| Parameter | Type | Description |
| --- | --- | --- |
| `scope` | string | The new scope. |

### get scope

The current scope.

### setItem(item, value)

Changes an item: at once in memory, then in the storage after the delay. Observers are called if the value
changes.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name; `$` stands for the scope. |
| `value` | string | The new value. |

### setItemIfValue(item, expected, value)

Changes an item only if its current value is `expected`.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name; `$` stands for the scope. |
| `expected` | string | The value the item must have. |
| `value` | string | The new value. |

### async remove(item)

Deletes an item, in memory and in the storage. Observers of the item are called.

| Parameter | Type | Description |
| --- | --- | --- |
| `item` | string | Item name; `$` stands for the scope. |

**Returns** `Promise<void>` Resolved once the adapter has deleted it.

### addObserver(items, recall)

Observes items: `recall` is called with the current values at the end of the current task, then whenever one of
them changes.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | string[] | Item names; `$` stands for the scope. |
| `recall` | Function | Called with `{item: value, …}`, keyed by the names given here. |

**Returns** `number` An id for `removeObserver()`.

### removeObserver(id)

Stops an observation. Its pending call, if any, is cancelled.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | number | The id returned by `addObserver()`. |
