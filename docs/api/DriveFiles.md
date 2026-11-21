# DriveFiles

Class `DriveFiles` · group `adapters` · source [`src/adapters/drive-files.mjs`](../../src/adapters/drive-files.mjs)

The files of an application in folders of Google Drive.

## Methods

### constructor({account, root = [], source = 'drive files'})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | object | The files. |
| `options.account` | object | The Google account (`googleAccount`), with the scope `drive.file`. |
| `options.root` | string[] | The folders under which the paths are, from the first one. |
| `options.source` | string | The source in `pendingWrites` and in the log of the requests (default `drive files`). |

### async folder(path, {create = false} = {})

The identifier of a folder.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | string | The folder, under the root (`''`: the root). |
| `options` | object | Options. |
| `options.create` | boolean | Create the missing folders (default `false`). |

**Returns** `Promise<string|null>` Its identifier, `null` when it does not exist (and is not created).

### async list(path)

The files of a folder (not its folders), sorted by name.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | string | The folder, under the root. |

**Returns** `Promise<{id: string, name: string, mimeType: string, size: number}[]>` The files; none when the folder
  does not exist.

### async find(path, name)

A file of a folder, by its name.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | string | The folder, under the root. |
| `name` | string | The name of the file. |

**Returns** `Promise<{id: string, name: string, mimeType: string, size: number}|null>` The file, `null` when it does
  not exist.

### async upload(path, blob, {name = blob.name, type = blob.type || 'application/octet-stream'} = {})

Sends a file into a folder, created when missing; a file of the same name is replaced.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | string | The folder, under the root. |
| `blob` | Blob | The content (a `File` gives its name and its type). |
| `options` | object | Options. |
| `options.name` | string | The name of the file (default: the name of the `File`). |
| `options.type` | string | Its type (default: the type of the `Blob`, else `application/octet-stream`). |

**Returns** `Promise<{id: string, name: string, mimeType: string, size: number}>` The file in Drive.

### async copy(file, path, {name = file.name} = {})

Copies a file into a folder, created when missing; a file of the same name there is kept (the copy is not made).

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | {id: string, name: string} | The file (as given by `list()` or `find()`). |
| `path` | string | The folder of the copy, under the root. |
| `options` | object | Options. |
| `options.name` | string | The name of the copy (default: the name of the file). |

**Returns** `Promise<{id: string, name: string, mimeType: string, size: number}>` The copy (or the file already
  there).

### async remove(file)

Puts a file in the trash of Drive (the user can take it back for 30 days).

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | {id: string, name: string} | The file (as given by `list()`, `find()`, `upload()`). |

**Returns** `Promise<void>` 

### async trash(path)

Puts a folder in the trash of Drive, with all it holds (the user can take it back for 30 days); a missing folder
is nothing to do.

| Parameter | Type | Description |
| --- | --- | --- |
| `path` | string | The folder, under the root (not the root itself). |

**Returns** `Promise<boolean>` `true` if the folder was put in the trash, `false` if it does not exist.

### async move(from, to)

Moves a folder, with all it holds, to another path: another parent (created when missing), another name, or both,
in one request; its files and folders keep their identifiers (their links in Drive still work). Done again once
the folder is moved, it does nothing: a process interrupted can be run again.

| Parameter | Type | Description |
| --- | --- | --- |
| `from` | string | The folder, under the root (not the root, nor the first folder of an empty root). |
| `to` | string | Its new path, under the root; it must not exist, nor be inside the folder. |

**Returns** `Promise<boolean>` `true` if the folder was moved, `false` if it does not exist (moved already?).

### read(file)

The content of a file.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | {id: string}\|string | The file, or its identifier. |

**Returns** `Promise<Blob>` Its content.

### viewerUrl(file)

The address of a file in the viewer of Drive, for the user (who must be signed in Google in the browser): it shows
the file, or offers to download it when it cannot be shown.

| Parameter | Type | Description |
| --- | --- | --- |
| `file` | {id: string}\|string | The file, or its identifier. |

**Returns** `string` The address.

### imageSource()

A source of images for `rc-image` (`defineImageSources`): the reference is the path of the file, under the root
(`notes/n42/plan.png`); a missing file is no image.

**Returns** `{load: function(string): Promise<Blob|null>}` The source.

### forget()

Forgets the folders and the lists kept: the next requests read Drive again.
