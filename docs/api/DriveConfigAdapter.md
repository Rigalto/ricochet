# DriveConfigAdapter

Class `DriveConfigAdapter` · group `adapters` · source [`src/adapters/drive-config.mjs`](../../src/adapters/drive-config.mjs)

Storage adapter for `config`: a local copy, and the Google Drive of the user.

## Methods

### constructor({name, local, account, folder = name, file = 'configuration.json', seed = null, uploadDelay = 5000, storage, store = config})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | object |  |
| `options.name` | string | The name of the application: the meta data in the local storage, the property of the file in Drive. |
| `options.local` | object | The local adapter (`IndexedDBAdapter`), with its default values. |
| `options.account` | object | The Google account (`googleAccount` of `adapters/google.mjs`, configured). |
| `options.folder` | string | The folder of the file in Drive (default: the name). |
| `options.file` | string | The name of the file (default `configuration.json`). |
| `options.seed` | Function | `async () => ({item: value, …})`: the items of a former storage, read once. |
| `options.uploadDelay` | number | The delay before a change is copied into Drive, in ms (default 5000). |
| `options.storage` | Storage | Where the meta data are kept (default `localStorage`); for the tests. |
| `options.store` | object | The store loaded again after a change from Drive (default `config`); for the tests. |

### get saveDelay

The delay of the store before it saves: the one of the local adapter (the local copy is written at once).

### get pending

The names of the items changed here and not copied into Drive yet.

### get pulled

Whether Drive was read in this page.

### async load()

**Returns** `Promise<object>` Every item, from the local copy (and the seed, the first time).

### async save(entries, options = {})

Stores items: at once in the local copy, later in Drive.

| Parameter | Type | Description |
| --- | --- | --- |
| `entries` | Array<{item: string, value: string}> | The items to store. |
| `options` | {keepalive: boolean} | `keepalive`: the page is being closed (the copy into Drive waits for the next start). |

### async remove(items)

Deletes items: at once in the local copy, later in Drive.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | string[] | The names of the items. |

### sync()

Copies into Drive, now, the changes that wait (and reads Drive, the first time in the page). Without a connection,
does nothing: the changes wait for the next one.

**Returns** `Promise<void>` 

### pull()

Reads Drive again, as at the start (the « refresh » of the application): the items changed in Drive and not here
come into the local copy, then the store is loaded again. Without a connection, does nothing.

**Returns** `Promise<void>` 

### async forget()

Erases the local copy and what is known of Drive (the file in Drive is kept), then loads the store again: the
default values. To call when the user signs out.

**Returns** `Promise<void>` 
