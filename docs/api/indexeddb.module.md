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
instance) share the same databases, and two applications with the same name would share their items. The items are
in the store `items` of the database, the name of the item as key and its value as value.

The database of the application holds the other local data of Ricochet too: the copies of the tables kept in Google
spreadsheets (store `tables`, see `DriveSheet`). Each part asks for its stores with `openAppDatabase(name, stores)`:
a missing store is created by moving the database to its next version, once, without losing the others. No version
number is kept anywhere. A page still running an older code at that moment closes its connection (`versionchange`);
if that older code asked for a fixed version, it can no longer open the database, and keeps its items in memory
until the page is reloaded.

The default values are used for the items that are not stored yet; they are not written to the database until the
application changes them.

## Without IndexedDB

When the browser offers no IndexedDB, or refuses it (some private windows), the adapter warns once in the console and
keeps the items in memory, as `MemoryAdapter` does: the application works, without persistence.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `openAppDatabase` | async function | Opens the local database of an application with the stores it needs: a store that is missing is created, the database moving to its next version (the other stores and their records are kept). A database that does not exist yet is created with these stores. The connection is the caller's: it is closed on `versionchange` (another part of the page, or another page, adds a store); the caller replaces `onversionchange` to know it, and opens the database again when it needs it. |
| `IndexedDBAdapter` | class | Storage adapter for `config`, in the local database of the browser. |

## Details

### openAppDatabase()

Opens the local database of an application with the stores it needs: a store that is missing is created, the
database moving to its next version (the other stores and their records are kept). A database that does not exist
yet is created with these stores. The connection is the caller's: it is closed on `versionchange` (another part of
the page, or another page, adds a store); the caller replaces `onversionchange` to know it, and opens the database
again when it needs it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | The name of the database: one per application. |
| `stores` | string[] | The names of the stores needed. |

**Returns** `Promise<IDBDatabase>` The open database; rejected when IndexedDB is not available, or refused.
