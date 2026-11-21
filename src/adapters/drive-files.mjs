// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The files of an application in folders of the Google Drive of the user: list a folder, send a file (an image, a
 * PDF, any file dropped by the user), read it back, copy it. The folders are named by a path under a root, and created
 * when a file is sent; the application never handles the identifiers of Drive.
 *
 * ```javascript
 * import {googleAccount} from 'ricochet/adapters/google.mjs'
 * import {DriveFiles} from 'ricochet/adapters/drive-files.mjs'
 * import {defineImageSources} from 'ricochet/ui/rc-image.mjs'
 *
 * const files = new DriveFiles({account: googleAccount, root: ['My app', 'data']})
 * await files.upload('notes/n42', droppedFile)          // My app/data/notes/n42/<name of the file>
 * const list = await files.list('notes/n42')            // [{id, name, mimeType, size}]
 * const blob = await files.read(list[0])
 * defineImageSources({drive: files.imageSource()})      // <rc-image source="drive" ref="notes/n42/plan.png">
 * ```
 *
 * ## Folders and files
 *
 * A path is the names of the folders under the root, separated by `/` (`notes/n42`); the root is a list of names
 * (`['My app', 'data']`). With the scope `drive.file`, the application sees only the folders and files it created:
 * the first folder of the root is found by its name anywhere in that space (as for `DriveSheet` and
 * `DriveConfigAdapter`, so that they share it), the others under their parent. Reading never creates a folder; sending
 * creates the missing ones.
 *
 * A name is unique in a folder: `upload()` replaces the content of a file of the same name (it keeps its identifier,
 * so that its links in Drive still work). The application asks the user before, if needed (`find()`). A file put in
 * the trash is no longer seen: by the user in Drive, or by `remove()` (a file) and `trash()` (a folder and all it
 * holds, the files of the user included); Drive keeps them in its trash for 30 days. `move()` moves a folder, with all
 * it holds, to another path (another parent, another name): its files keep their identifiers.
 *
 * ## Memory
 *
 * The identifiers of the folders and the list of each folder read are kept for the page: the images of a page ask for
 * one list per folder, not one request per image. `upload()`, `copy()`, `remove()`, `trash()` and `move()` keep them
 * up to date; `forget()` drops
 * everything (the user changed Drive by hand: the next requests read it again).
 *
 * ## Sending
 *
 * A file up to 5 MB is sent in one request (`multipart`); a larger one in two (`resumable`: the address of the
 * sending, then the content). What is sent is counted in `pendingWrites` (source `drive files` by default) until
 * Drive answers.
 *
 * @module drive-files
 * @category adapters
 */

import {pendingWrites} from '../core/pending.mjs'

const DRIVE = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_TYPE = 'application/vnd.google-apps.folder'
const FIELDS = 'id,name,mimeType,size'
const SIMPLE_LIMIT = 5 * 1024 * 1024 // above, a resumable sending

// a name in a query of Drive
const quote = text => `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`

// the names of a path: 'a/b' → ['a', 'b'] (empty names dropped)
const names = path => String(path ?? '').split('/').filter(name => name !== '')

// a file as given to the application
const describe = ({id, name, mimeType, size}) => ({id, name, mimeType: mimeType ?? '', size: Number(size ?? 0)})

/** The files of an application in folders of Google Drive. */
export class DriveFiles {
  #account
  #root
  #source
  #sending = 0 // files being sent or copied
  #folders = new Map() // path (root included) → Promise of the identifier of the folder (null: missing)
  #lists = new Map() // identifier of a folder → Promise of Map name → file

  /**
   * @param {object} options - The files.
   * @param {object} options.account - The Google account (`googleAccount`), with the scope `drive.file`.
   * @param {string[]} [options.root] - The folders under which the paths are, from the first one.
   * @param {string} [options.source] - The source in `pendingWrites` and in the log of the requests (default
   *   `drive files`).
   */
  constructor ({account, root = [], source = 'drive files'}) {
    this.#account = account
    this.#root = [...root]
    this.#source = source
  }

  /**
   * The identifier of a folder.
   * @param {string} path - The folder, under the root (`''`: the root).
   * @param {object} [options] - Options.
   * @param {boolean} [options.create] - Create the missing folders (default `false`).
   * @returns {Promise<string|null>} Its identifier, `null` when it does not exist (and is not created).
   */
  async folder (path, {create = false} = {}) {
    let parent = null
    const done = []
    for (const name of [...this.#root, ...names(path)]) {
      done.push(name)
      const key = done.join('/')
      let promise = this.#folders.get(key)
      // a missing folder is looked for again when it must be created (it may have been created since)
      if (promise === undefined || (create && await promise === null)) {
        promise = this.#findFolder(name, parent, create)
        this.#folders.set(key, promise)
        promise.catch(() => this.#folders.delete(key))
      }
      parent = await promise
      if (parent === null) { return null }
    }
    return parent
  }

  /**
   * The files of a folder (not its folders), sorted by name.
   * @param {string} path - The folder, under the root.
   * @returns {Promise<{id: string, name: string, mimeType: string, size: number}[]>} The files; none when the folder
   *   does not exist.
   */
  async list (path) {
    const folder = await this.folder(path)
    if (folder === null) { return [] }
    return [...(await this.#files(folder)).values()].sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * A file of a folder, by its name.
   * @param {string} path - The folder, under the root.
   * @param {string} name - The name of the file.
   * @returns {Promise<{id: string, name: string, mimeType: string, size: number}|null>} The file, `null` when it does
   *   not exist.
   */
  async find (path, name) {
    const folder = await this.folder(path)
    if (folder === null) { return null }
    return (await this.#files(folder)).get(name) ?? null
  }

  /**
   * Sends a file into a folder, created when missing; a file of the same name is replaced.
   * @param {string} path - The folder, under the root.
   * @param {Blob} blob - The content (a `File` gives its name and its type).
   * @param {object} [options] - Options.
   * @param {string} [options.name] - The name of the file (default: the name of the `File`).
   * @param {string} [options.type] - Its type (default: the type of the `Blob`, else `application/octet-stream`).
   * @returns {Promise<{id: string, name: string, mimeType: string, size: number}>} The file in Drive.
   */
  async upload (path, blob, {name = blob.name, type = blob.type || 'application/octet-stream'} = {}) {
    if (typeof name !== 'string' || name === '' || name.includes('/')) { throw new Error(`DriveFiles: invalid file name '${name}'`) }
    this.#count(1)
    try {
      const folder = await this.folder(path, {create: true})
      const files = await this.#files(folder)
      const old = files.get(name)
      const file = old === undefined ? await this.#create(folder, name, type, blob) : await this.#replace(old.id, type, blob)
      const result = describe({...file, name, mimeType: file.mimeType ?? type, size: file.size ?? blob.size})
      files.set(name, result)
      return result
    } finally {
      this.#count(-1)
    }
  }

  /**
   * Copies a file into a folder, created when missing; a file of the same name there is kept (the copy is not made).
   * @param {{id: string, name: string}} file - The file (as given by `list()` or `find()`).
   * @param {string} path - The folder of the copy, under the root.
   * @param {object} [options] - Options.
   * @param {string} [options.name] - The name of the copy (default: the name of the file).
   * @returns {Promise<{id: string, name: string, mimeType: string, size: number}>} The copy (or the file already
   *   there).
   */
  async copy (file, path, {name = file.name} = {}) {
    this.#count(1)
    try {
      const folder = await this.folder(path, {create: true})
      const files = await this.#files(folder)
      if (files.has(name)) { return files.get(name) }
      const copy = describe(await this.#account.request(`${DRIVE}/${encodeURIComponent(file.id)}/copy`, {
        method: 'POST', query: {fields: FIELDS}, body: {name, parents: [folder]}, source: this.#source
      }))
      files.set(name, copy)
      return copy
    } finally {
      this.#count(-1)
    }
  }

  /**
   * Puts a file in the trash of Drive (the user can take it back for 30 days).
   * @param {{id: string, name: string}} file - The file (as given by `list()`, `find()`, `upload()`).
   * @returns {Promise<void>}
   */
  async remove (file) {
    await this.#account.request(`${DRIVE}/${encodeURIComponent(file.id)}`, {
      method: 'PATCH', query: {fields: 'id'}, body: {trashed: true}, source: this.#source
    })
    for (const promise of this.#lists.values()) {
      const files = await promise.catch(() => null)
      if (files?.get(file.name)?.id === file.id) { files.delete(file.name) }
    }
  }

  /**
   * Puts a folder in the trash of Drive, with all it holds (the user can take it back for 30 days); a missing folder
   * is nothing to do.
   * @param {string} path - The folder, under the root (not the root itself).
   * @returns {Promise<boolean>} `true` if the folder was put in the trash, `false` if it does not exist.
   */
  async trash (path) {
    if (names(path).length === 0) { throw new Error('DriveFiles: the root cannot be put in the trash') }
    const folder = await this.folder(path)
    if (folder === null) { return false }
    await this.#account.request(`${DRIVE}/${encodeURIComponent(folder)}`, {
      method: 'PATCH', query: {fields: 'id'}, body: {trashed: true}, source: this.#source
    })
    // forgotten: the folder and the folders under it
    const key = [...this.#root, ...names(path)].join('/')
    for (const [kept, promise] of this.#folders) {
      if (kept === key || kept.startsWith(`${key}/`)) {
        this.#folders.delete(kept)
        const id = await promise.catch(() => null)
        if (id !== null) { this.#lists.delete(id) }
      }
    }
    return true
  }

  /**
   * Moves a folder, with all it holds, to another path: another parent (created when missing), another name, or both,
   * in one request; its files and folders keep their identifiers (their links in Drive still work). Done again once
   * the folder is moved, it does nothing: a process interrupted can be run again.
   * @param {string} from - The folder, under the root (not the root, nor the first folder of an empty root).
   * @param {string} to - Its new path, under the root; it must not exist, nor be inside the folder.
   * @returns {Promise<boolean>} `true` if the folder was moved, `false` if it does not exist (moved already?).
   */
  async move (from, to) {
    const source = names(from)
    const target = names(to)
    if (source.length === 0 || target.length === 0) { throw new Error('DriveFiles: the root cannot be moved') }
    const fromPath = source.join('/')
    const toPath = target.join('/')
    if (toPath === fromPath || toPath.startsWith(`${fromPath}/`)) { throw new Error(`DriveFiles: '${from}' cannot be moved into itself`) }
    const folder = await this.folder(fromPath)
    if (folder === null) { return false }
    if (await this.folder(toPath) !== null) { throw new Error(`DriveFiles: '${to}' exists already`) }
    const oldParent = await this.folder(source.slice(0, -1).join('/'))
    if (oldParent === null) { throw new Error('DriveFiles: the first folder of the root cannot be moved') }
    this.#count(1)
    try {
      const newParent = await this.folder(target.slice(0, -1).join('/'), {create: true})
      const query = {fields: 'id', ...(newParent === oldParent ? {} : {addParents: newParent, removeParents: oldParent})}
      await this.#account.request(`${DRIVE}/${encodeURIComponent(folder)}`, {
        method: 'PATCH', query, body: {name: target.at(-1)}, source: this.#source
      })
    } finally {
      this.#count(-1)
    }
    // the paths of the folder, and under it, forgotten; the new path known (the lists, by identifier, stay right)
    const fromKey = [...this.#root, ...source].join('/')
    const toKey = [...this.#root, ...target].join('/')
    for (const kept of [...this.#folders.keys()]) {
      if ([fromKey, toKey].some(key => kept === key || kept.startsWith(`${key}/`))) { this.#folders.delete(kept) }
    }
    this.#folders.set(toKey, Promise.resolve(folder))
    return true
  }

  /**
   * The content of a file.
   * @param {{id: string}|string} file - The file, or its identifier.
   * @returns {Promise<Blob>} Its content.
   */
  read (file) {
    const id = typeof file === 'string' ? file : file.id
    return this.#account.request(`${DRIVE}/${encodeURIComponent(id)}`, {query: {alt: 'media'}, answer: 'blob', source: this.#source})
  }

  /**
   * The address of a file in the viewer of Drive, for the user (who must be signed in Google in the browser): it shows
   * the file, or offers to download it when it cannot be shown.
   * @param {{id: string}|string} file - The file, or its identifier.
   * @returns {string} The address.
   */
  viewerUrl (file) { return `https://drive.google.com/file/d/${encodeURIComponent(typeof file === 'string' ? file : file.id)}/view` }

  /**
   * A source of images for `rc-image` (`defineImageSources`): the reference is the path of the file, under the root
   * (`notes/n42/plan.png`); a missing file is no image.
   * @returns {{load: function(string): Promise<Blob|null>}} The source.
   */
  imageSource () {
    return {
      load: async ref => {
        const parts = names(ref)
        const name = parts.pop()
        if (name === undefined) { return null }
        const file = await this.find(parts.join('/'), name)
        return file === null ? null : this.read(file)
      }
    }
  }

  /** Forgets the folders and the lists kept: the next requests read Drive again. */
  forget () {
    this.#folders.clear()
    this.#lists.clear()
  }

  // ---------------------------------------------------------------- inside

  // one more (or one less) file being sent, reported to pendingWrites
  #count (step) {
    this.#sending += step
    pendingWrites.report(this.#source, {count: this.#sending, state: 'saving', saved: step < 0})
  }

  // a folder under its parent (the first one: anywhere), created when missing (unless create is false: null)
  async #findFolder (name, parent, create) {
    const where = parent === null ? '' : ` and ${quote(parent)} in parents`
    const {files = []} = await this.#account.request(DRIVE, {
      query: {q: `name = ${quote(name)} and mimeType = '${FOLDER_TYPE}'${where} and trashed = false`, fields: 'files(id)', spaces: 'drive'},
      source: this.#source
    }) ?? {}
    if (files.length > 0) { return files[0].id }
    if (!create) { return null }
    const folder = await this.#account.request(DRIVE, {
      method: 'POST', query: {fields: 'id'}, body: {name, mimeType: FOLDER_TYPE, parents: parent === null ? [] : [parent]}, source: this.#source
    })
    this.#lists.set(folder.id, Promise.resolve(new Map())) // a new folder is empty
    return folder.id
  }

  // the files of a folder, read once: name → file
  #files (folder) {
    let promise = this.#lists.get(folder)
    if (promise === undefined) {
      promise = this.#readList(folder)
      this.#lists.set(folder, promise)
      promise.catch(() => this.#lists.delete(folder))
    }
    return promise
  }

  async #readList (folder) {
    const files = new Map()
    let pageToken
    do {
      const answer = await this.#account.request(DRIVE, {
        query: {
          q: `${quote(folder)} in parents and mimeType != '${FOLDER_TYPE}' and trashed = false`,
          fields: `nextPageToken,files(${FIELDS})`,
          spaces: 'drive',
          pageSize: 1000,
          ...(pageToken === undefined ? {} : {pageToken})
        },
        source: this.#source
      }) ?? {}
      for (const file of answer.files ?? []) {
        if (!files.has(file.name)) { files.set(file.name, describe(file)) } // two files of the same name: the first one
      }
      pageToken = answer.nextPageToken
    } while (pageToken !== undefined)
    return files
  }

  // a new file
  async #create (folder, name, type, blob) {
    const metadata = {name, mimeType: type, parents: [folder]}
    if (blob.size <= SIMPLE_LIMIT) {
      const boundary = `ricochet${Math.random().toString(36).slice(2)}`
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
        `--${boundary}\r\nContent-Type: ${type}\r\n\r\n`, blob, `\r\n--${boundary}--`
      ])
      return this.#account.request(UPLOAD, {
        method: 'POST', query: {uploadType: 'multipart', fields: FIELDS}, body,
        headers: {'Content-Type': `multipart/related; boundary=${boundary}`}, source: this.#source
      })
    }
    return this.#resumable('POST', UPLOAD, metadata, type, blob)
  }

  // the new content of a file
  #replace (id, type, blob) {
    const url = `${UPLOAD}/${encodeURIComponent(id)}`
    if (blob.size <= SIMPLE_LIMIT) {
      return this.#account.request(url, {
        method: 'PATCH', query: {uploadType: 'media', fields: FIELDS}, body: blob, headers: {'Content-Type': type}, source: this.#source
      })
    }
    return this.#resumable('PATCH', url, {mimeType: type}, type, blob)
  }

  // a large file: the address of the sending (header Location), then the content
  async #resumable (method, url, metadata, type, blob) {
    const response = await this.#account.request(url, {
      method, query: {uploadType: 'resumable', fields: FIELDS}, body: metadata,
      headers: {'X-Upload-Content-Type': type, 'X-Upload-Content-Length': String(blob.size)}, answer: 'response', source: this.#source
    })
    const location = response.headers.get('Location')
    if (location === null) { throw new Error('DriveFiles: Drive gave no address for the sending') }
    return this.#account.request(location, {method: 'PUT', body: blob, headers: {'Content-Type': type}, source: this.#source})
  }
}
