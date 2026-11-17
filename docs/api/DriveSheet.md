# DriveSheet

Class `DriveSheet` · group `adapters` · source [`src/adapters/drive-sheet.mjs`](../../src/adapters/drive-sheet.mjs)

A table in a tab of a Google spreadsheet, with a local copy.

## Methods

### static async forgetAll(database = DATABASE)

Erases all the local copies of a database (the spreadsheets in Drive are kept), with the changes that wait: the
tables of the page are emptied too. For the disconnection of the account, or to read everything again from Drive.

| Parameter | Type | Description |
| --- | --- | --- |
| `database` | string | The database (default `ricochet-sheets`). |

**Returns** `Promise<void>` 

### get rows

The rows in memory (after `load()`, `pull()` or `create()`), in the order of the tab; `null` before.

### get headers

The headers: the ones of the tab, in its order, then the columns of the application missing in it.

### get pending

The keys of the rows changed here and not yet in Drive.

### async load()

The local copy, without Google.

**Returns** `Promise<object[]|null>` The rows, or `null` when the table was never read on this browser.

### async pull()

Reads the tab in Drive: its rows, with the changes that wait, become the local copy.

**Returns** `Promise<object[]|null>` The rows, or `null` when the spreadsheet does not exist.

### async create(rows)

Creates the folders, the spreadsheet with its tab and its headers, and writes the rows.

| Parameter | Type | Description |
| --- | --- | --- |
| `rows` | object[] | The rows, each with its key. |

**Returns** `Promise<object[]>` The rows.

### async put(row)

A new row, or a row replaced (same key): at once in the local copy, a few seconds later in Drive.

| Parameter | Type | Description |
| --- | --- | --- |
| `row` | object | The row, with its key. |

**Returns** `Promise<void>` When the local copy is written.

### async remove(key)

Deletes a row: at once in the local copy, a few seconds later in Drive.

| Parameter | Type | Description |
| --- | --- | --- |
| `key` | string | The key of the row. |

**Returns** `Promise<void>` When the local copy is written.

### sync()

Sends now the changes that wait. Without a connection, or before the spreadsheet is known (`pull()`,
`create()`), does nothing: they wait.

**Returns** `Promise<void>` 

### async forget()

Erases the local copy (the spreadsheet in Drive is kept), with the changes that wait.

**Returns** `Promise<void>` 
