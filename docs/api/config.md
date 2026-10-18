# config

Module `config` · group `core` · source [`src/core/config.mjs`](../../src/core/config.mjs)

The store of configuration items: shared, persistent key/value pairs. One instance, `config`, serves the whole
application and registers itself as the item store of the kernel (see the `items` module) when this module is
imported.

- **Storage.** The store does not know where the items live: an *adapter*, given by the application with
  `setAdapter()`, loads and saves them (an HTTP server, Google Drive, memory…).
- **Observers.** `addObserver(items, recall)` calls `recall({item: value, …})` once with the current values, then
  whenever one of the items changes. Calls are grouped: an observer is called once at the end of the current task,
  however many of its items changed.
- **Saving.** A change is applied at once in memory and saved 2 seconds later, together with the other changes of
  that time (a scheduled task, `rcConfigSave`). Pending changes are saved at once when the page is hidden or closed.
  When a save fails, the changes stay pending and are saved again 30 seconds later.
- **Scope.** In an item name, `$` stands for the current scope, set with `setScope()`: `table-$-sort` is
  `table-hom-not-sort` while the scope is `hom-not`. When the scope changes, only the observers whose values change
  are called.

Every change is recorded in `$global.logs.items` and `$global.logs.timeline`.

## Adapters

An adapter is an object with three asynchronous methods:

| Method | Role |
| --- | --- |
| `load()` | resolves with every item, as `{item: value, …}` |
| `save(entries, options)` | saves `[{item, value}, …]`; `options.keepalive` is true when the page is being closed |
| `remove(items)` | deletes the items of an array of names |

```javascript
import {config} from 'ricochet/core/config.mjs'

config.setAdapter(myAdapter)
await config.load()
```

## Interface

| Kind | Name | Direction | Description |
| --- | --- | --- | --- |
| event | `configLoaded` | out | The items are loaded for the first time. |
| event | `configRefreshed` | out | The items are loaded again. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `ConfigStore` | class | A store of configuration items. The application uses the `config` instance; other instances are useful for tests. |
| `config` | const | The store of configuration items of the application. |
