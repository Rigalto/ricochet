# DriveConfigAdapter

Class `DriveConfigAdapter` · group `adapters` · source [`src/adapters/drive-config.mjs`](../../src/adapters/drive-config.mjs)

Storage adapter for `config`: a local copy, and the Google Drive of the user.

## Methods

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
