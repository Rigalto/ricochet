# drive-sheet

Module `drive-sheet` · group `adapters` · source [`src/adapters/drive-sheet.mjs`](../../src/adapters/drive-sheet.mjs)

A table kept in a tab of a Google spreadsheet, in the Drive of the user, with a local copy in the browser: the rows
are objects whose keys are the headers of the tab; one column (`key`) identifies them. The application reads the
whole table into memory, and changes it row by row.

```javascript
import {googleAccount} from 'ricochet/adapters/google.mjs'
import {DriveSheet} from 'ricochet/adapters/drive-sheet.mjs'

const notes = new DriveSheet({
  account: googleAccount,                 // configured, with the scope drive.file
  path: ['My app', 'data', 'notes'],      // the folders, created when missing
  file: 'notes',                          // the spreadsheet
  tab: 'rows',
  columns: ['id', 'Label', 'Done'],       // the headers written by the application
  key: 'id'
})
let rows = await notes.load()             // the local copy: at once (null the first time)
rows = await notes.pull()                 // Drive (null: no spreadsheet yet)
if (rows === null) { rows = await notes.create([{id: 'a1', Label: 'First', Done: false}]) }
notes.put({id: 'a2', Label: 'Second', Done: true})
```

## The spreadsheet

The first row of the tab holds the headers. The rows are read with their raw values (numbers, booleans, text) and
written as they are (`RAW`: a date is the text written by the application). A header written by the user in the
spreadsheet is kept: its values come with the rows, and are written back. The columns keep the order of the tab (the
user may move them); a column of `columns` missing in the tab (deleted by hand) is added again at the end when the
tab is written; a column deleted from `columns` but still in the tab stays there. A row without key, added by hand, is kept at the end of the tab, and not given to the
application. The user may sort, edit or add rows in the spreadsheet: the rows are found again by their key.

With the scope `drive.file`, the application sees only the folders and spreadsheets it created. The first folder
of the path is found by its name anywhere in that space (as the folder of `DriveConfigAdapter`), the others under
their parent.

## Reading

- `load()` gives the local copy, at once, without Google: the rows of the last reading, with the changes made since.
- `pull()` reads the tab in Drive: its rows, with the changes made here and not yet sent, become the local copy.
  It gives `null` when the spreadsheet does not exist (`create()`): never created, deleted, or put in the trash by
  the user (a spreadsheet in the trash is no longer used, even though Google still lets it be read). Without a connection, it fails (`GoogleError`
  or `Error`): the application keeps the local copy.
- `create(rows)` creates the folders, the spreadsheet with its tab and headers, and writes the rows.

## Changes

`put(row)` (a new row, or a row replaced: same key) and `remove(key)` change the local copy at once, then the tab
a few seconds later (`uploadDelay`): the tab is read again, the rows changed here replace its rows, and the whole
tab is written in one request (the spreadsheet is checked first: one in the trash is not written, the changes wait).
A row changed in the spreadsheet and not here keeps the version of the spreadsheet;
the last change of a row wins. A failed sending is tried again 30 seconds later (`retryDelay`), and at the next
connection; the changes wait in the local copy, even when the page is closed.

What waits is reported to `pendingWrites` (source `sheet <file>/<tab>` by default), as for `DriveConfigAdapter`.

## The local copy

One record per table in the store `tables` of an IndexedDB database: the rows, the headers, the identifier of the
spreadsheet and the changes that wait. The database is the one of the application (option `database`: its name, as
given to `IndexedDBAdapter`; `ricochet-sheets` by default), next to its items; the store is added to it when missing
(`openAppDatabase`). Without IndexedDB (private window…), the copy stays in memory, for the page. `forget()` erases
the copy of a table, `DriveSheet.forgetAll(database)` the copies of all the tables of the database (the spreadsheets
in Drive are kept).

## Limits

A cell holds 50 000 characters at most: a longer text is refused by Google, and the sending fails. The whole tab
is written at each sending: the adapter suits tables of some hundreds of rows.

## Interface

| Kind | Name | Direction | Description |
| --- | --- | --- | --- |
| event | `googleConnected` | in | The account is connected: the changes that wait are sent. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `DriveSheet` | class | A table in a tab of a Google spreadsheet, with a local copy. |
