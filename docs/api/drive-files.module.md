# drive-files

Module `drive-files` · group `adapters` · source [`src/adapters/drive-files.mjs`](../../src/adapters/drive-files.mjs)

The files of an application in folders of the Google Drive of the user: list a folder, send a file (an image, a
PDF, any file dropped by the user), read it back, copy it. The folders are named by a path under a root, and created
when a file is sent; the application never handles the identifiers of Drive.

```javascript
import {googleAccount} from 'ricochet/adapters/google.mjs'
import {DriveFiles} from 'ricochet/adapters/drive-files.mjs'
import {defineImageSources} from 'ricochet/ui/rc-image.mjs'

const files = new DriveFiles({account: googleAccount, root: ['My app', 'data']})
await files.upload('notes/n42', droppedFile)          // My app/data/notes/n42/<name of the file>
const list = await files.list('notes/n42')            // [{id, name, mimeType, size}]
const blob = await files.read(list[0])
defineImageSources({drive: files.imageSource()})      // <rc-image source="drive" ref="notes/n42/plan.png">
```

## Folders and files

A path is the names of the folders under the root, separated by `/` (`notes/n42`); the root is a list of names
(`['My app', 'data']`). With the scope `drive.file`, the application sees only the folders and files it created:
the first folder of the root is found by its name anywhere in that space (as for `DriveSheet` and
`DriveConfigAdapter`, so that they share it), the others under their parent. Reading never creates a folder; sending
creates the missing ones.

A name is unique in a folder: `upload()` replaces the content of a file of the same name (it keeps its identifier,
so that its links in Drive still work). The application asks the user before, if needed (`find()`). A file put in
the trash is no longer seen: by the user in Drive, or by `remove()` (a file) and `trash()` (a folder and all it
holds, the files of the user included); Drive keeps them in its trash for 30 days.

## Memory

The identifiers of the folders and the list of each folder read are kept for the page: the images of a page ask for
one list per folder, not one request per image. `upload()` and `copy()` keep the lists up to date; `forget()` drops
everything (the user changed Drive by hand: the next requests read it again).

## Sending

A file up to 5 MB is sent in one request (`multipart`); a larger one in two (`resumable`: the address of the
sending, then the content). What is sent is counted in `pendingWrites` (source `drive files` by default) until
Drive answers.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `DriveFiles` | class | The files of an application in folders of Google Drive. |
