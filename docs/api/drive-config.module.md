# drive-config

Module `drive-config` · group `adapters` · source [`src/adapters/drive-config.mjs`](../../src/adapters/drive-config.mjs)

A storage adapter that keeps the configuration items in the Google Drive of the user, with a local copy in the
browser: the application starts at once from the local copy, works without Google, and Drive becomes the reference
as soon as the user is connected.

```javascript
import {start, IndexedDBAdapter} from 'ricochet/ricochet.mjs'
import {googleAccount} from 'ricochet/adapters/google.mjs'
import {DriveConfigAdapter} from 'ricochet/adapters/drive-config.mjs'

const storage = new DriveConfigAdapter({
  name: 'my-app',                                         // the local copy and the file in Drive
  local: new IndexedDBAdapter('my-app', {'ricochet-theme': 'system'}),
  account: googleAccount,                                 // configured by the application
  folder: 'My app'                                        // the folder of the file in Drive
})
await start({storage})
```

## The local copy

Every change is written first to the local adapter (IndexedDB), at once: nothing is lost when the page is closed,
whether the user is connected or not. The names of the items changed since the last copy to Drive are kept in the
local storage of the browser (`ricochet-drive-config-<name>`), with the identifier of the file in Drive.

## Drive

The items are one JSON file (`configuration.json` by default) in a folder of the Drive of the user, created by the
adapter; with the scope `drive.file`, the application sees only this file and the folder. The user can read it in
Drive.

- **Once per page, as soon as the account is connected** (at the start, or later when the user signs in): the
  file is read; the items changed in Drive (by another computer, another tab) and not changed here are copied into
  the local copy, then the store is loaded again (`configRefreshed`). The first time, when there is no file yet, it
  is created with the local items: they are copied into Drive.
- **After a change**, the items changed here are copied into Drive a few seconds later (`uploadDelay`, 5 seconds by
  default), merged with the file as it is in Drive: an item changed by another tab and not here is kept. The last
  change of an item wins.
- **Not connected, or token expired**: the changes wait in the local copy, and are copied into Drive at the next
  connection.
- **No permanent synchronization**: after the start, the changes made elsewhere are not taken back (until `pull()`,
  the « refresh » of the application); two tabs may keep different settings.

## Seed

`seed`, optional, gives the items of a former storage (an HTTP server…), read once on this browser, the first time
the adapter loads, while no file of Drive is known: used when an application moves to Drive.

## Signing out

`forget()` erases the local copy and what the adapter knows of Drive: to call when the user signs out (on a shared
computer, the settings of the user must not stay). The store is then loaded again: the default values.

## Interface

| Kind | Name | Direction | Description |
| --- | --- | --- | --- |
| event | `googleConnected` | in | The account is connected: the first reading of Drive, or the changes that wait. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `DriveConfigAdapter` | class | Storage adapter for `config`: a local copy, and the Google Drive of the user. |
