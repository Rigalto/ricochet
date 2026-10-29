# indexeddb

Module `indexeddb` · group `adapters` · source [`src/adapters/indexeddb.mjs`](../../src/adapters/indexeddb.mjs)

A storage adapter that keeps the configuration items in the local database of the browser (IndexedDB): they
survive a reload of the page and a restart of the browser, on this computer and in this browser only, without any
server. For small applications served as static files, and for demonstrations.

```javascript
import {start, IndexedDBAdapter} from 'ricochet/ricochet.mjs'

await start({storage: new IndexedDBAdapter('my-app', {'ricochet-theme': 'system'})})
```

## Database

Each application gives its own name: the applications served from the same site (a GitHub Pages account, for
instance) share the same databases, and two applications with the same name would share their items. The database
has one table of items, the name of the item as key and its value as value.

The default values are used for the items that are not stored yet; they are not written to the database until the
application changes them.

## Without IndexedDB

When the browser offers no IndexedDB, or refuses it (some private windows), the adapter warns once in the console and
keeps the items in memory, as `MemoryAdapter` does: the application works, without persistence.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `IndexedDBAdapter` | class | Storage adapter for `config`, in the local database of the browser. |
