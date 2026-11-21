// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-drive-files.mjs — node tests/run.mjs DriveFiles
// The files of an application in folders of Drive (adapters/drive-files.mjs), with a fake Drive and a fake account:
// the folders found or created, the lists kept, the sending (one request, or two for a large file), the replacement,
// the copy, the reading, the source of images, the trash, the move, forget().

import {describe, assert} from './kernel.mjs'
import {DriveFiles} from '../src/adapters/drive-files.mjs'
import {pendingWrites} from '../src/core/pending.mjs'
import {bus} from '../src/core/bus.mjs'

const FOLDER = 'application/vnd.google-apps.folder'

// a File: Node before 20 has none (a Blob with a name is enough for DriveFiles)
const TestFile = globalThis.File ?? class extends Blob {
  constructor (parts, name, options) {
    super(parts, options)
    this.name = name
  }
}

// Drive: folders and files, the requests of DriveFiles
class FakeDrive {
  files = new Map() // id → {name, mimeType, parents, content, trashed}
  calls = []
  #next = 1

  add (file) {
    const id = `${file.mimeType === FOLDER ? 'd' : 'f'}${this.#next++}`
    this.files.set(id, {parents: [], trashed: false, ...file})
    return id
  }

  async request (url, {method = 'GET', query = {}, body, headers = {}, answer = 'json'} = {}) {
    const path = url.replace(/^https:\/\/[^/]+/, '')
    this.calls.push(`${method} ${path}${query.uploadType ? ` ${query.uploadType}` : ''}${query.alt ? ` ${query.alt}` : ''}`)
    if (path === '/drive/v3/files' && method === 'GET') {
      const q = query.q
      const inParent = /'([^']+)' in parents/.exec(q)?.[1]
      const name = /name = '((?:[^'\\]|\\.)*)'/.exec(q)?.[1]?.replaceAll("\\'", "'")
      const wantsFolder = q.includes(`mimeType = '${FOLDER}'`)
      const found = [...this.files].filter(([id, f]) => !this.inTrash(id) && (name === undefined || f.name === name) &&
        (wantsFolder ? f.mimeType === FOLDER : f.mimeType !== FOLDER) && (inParent === undefined || f.parents.includes(inParent)))
      return {files: found.map(([id, f]) => ({id, name: f.name, mimeType: f.mimeType, size: String(f.content?.length ?? 0)}))}
    }
    if (path === '/drive/v3/files' && method === 'POST') { return {id: this.add({...body})} }
    const copy = /^\/drive\/v3\/files\/([^/]+)\/copy$/.exec(path)
    if (copy !== null) {
      const source = this.files.get(copy[1])
      const id = this.add({...source, ...body})
      return {id, name: body.name, mimeType: source.mimeType, size: String(source.content.length)}
    }
    const media = /^\/drive\/v3\/files\/([^/]+)$/.exec(path)
    if (media !== null && query.alt === 'media') { return new Blob([this.files.get(media[1]).content]) }
    if (media !== null && method === 'PATCH') {
      const file = this.files.get(media[1])
      if (query.addParents !== undefined) { file.parents = [...file.parents.filter(parent => parent !== query.removeParents), query.addParents] }
      Object.assign(file, body)
      return {id: media[1]}
    }
    if (path === '/upload/drive/v3/files' && query.uploadType === 'multipart') {
      const text = await body.text()
      const boundary = /boundary=(.+)$/.exec(headers['Content-Type'])[1]
      const [meta, content] = text.split(`--${boundary}`).slice(1, 3).map(part => part.split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, ''))
      const metadata = JSON.parse(meta)
      const id = this.add({...metadata, content})
      return {id, name: metadata.name, mimeType: metadata.mimeType, size: String(content.length)}
    }
    if (query.uploadType === 'resumable') {
      this.lastResumable = {method, body, headers}
      const target = /\/upload\/drive\/v3\/files\/?(.*)$/.exec(path)[1]
      const location = `https://upload.example/session/${target || 'new'}/${encodeURIComponent(JSON.stringify(body))}`
      return answer === 'response' ? {status: 200, headers: {get: header => header === 'Location' ? location : null}} : null
    }
    if (path.startsWith('/session/') && method === 'PUT') {
      const [, target, meta] = /^\/session\/([^/]+)\/(.*)$/.exec(path)
      const content = await body.text()
      if (target === 'new') {
        const metadata = JSON.parse(decodeURIComponent(meta))
        const id = this.add({...metadata, content})
        return {id, name: metadata.name, mimeType: metadata.mimeType, size: String(content.length)}
      }
      const file = this.files.get(target)
      file.content = content
      return {id: target, name: file.name, mimeType: file.mimeType, size: String(content.length)}
    }
    const replace = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(path)
    if (replace !== null && query.uploadType === 'media') {
      const file = this.files.get(replace[1])
      file.content = await body.text()
      file.mimeType = headers['Content-Type']
      return {id: replace[1], name: file.name, mimeType: file.mimeType, size: String(file.content.length)}
    }
    throw new Error(`unexpected ${method} ${path}`)
  }

  // in the trash: the file, or one of its folders (Drive puts the content of a folder in the trash with it)
  inTrash (id) {
    const file = this.files.get(id)
    return file.trashed || file.parents.some(parent => this.inTrash(parent))
  }

  // the file at a path of names
  at (...names) {
    let parent = null
    let found = null
    for (const name of names) {
      found = [...this.files].find(([, f]) => f.name === name && !f.trashed && (parent === null || f.parents.includes(parent)))
      if (found === undefined) { return null }
      parent = found[0]
    }
    return found[1]
  }
}

const reports = []
bus.on('pendingChanged', ({sources}) => { if (sources['drive files'] !== undefined) { reports.push(sources['drive files'].count) } })

await describe('DriveFiles — folders and lists', async () => {
  const drive = new FakeDrive()
  const files = new DriveFiles({account: drive, root: ['App', 'data']})
  assert('a missing folder: null, nothing created', await files.folder('notes/n1') === null && drive.files.size === 0)
  assert('the list of a missing folder: empty', (await files.list('notes/n1')).length === 0)
  assert('find in a missing folder: null', await files.find('notes/n1', 'a.png') === null)
  const app = drive.add({name: 'App', mimeType: FOLDER})
  const data = drive.add({name: 'data', mimeType: FOLDER, parents: [app]})
  const notes = drive.add({name: 'notes', mimeType: FOLDER, parents: [data]})
  const n1 = drive.add({name: 'n1', mimeType: FOLDER, parents: [notes]})
  drive.add({name: 'b.pdf', mimeType: 'application/pdf', parents: [n1], content: 'pdf'})
  drive.add({name: 'a.png', mimeType: 'image/png', parents: [n1], content: 'png'})
  drive.add({name: 'old.png', mimeType: 'image/png', parents: [n1], content: 'x', trashed: true})
  drive.add({name: 'sub', mimeType: FOLDER, parents: [n1]})
  files.forget()
  const list = await files.list('notes/n1')
  assert('the files of a folder, sorted by name, without its folders nor the trash',
    list.map(f => f.name).join() === 'a.png,b.pdf' && list[0].mimeType === 'image/png' && list[0].size === 3)
  drive.calls.length = 0
  const found = await files.find('notes/n1', 'b.pdf')
  assert('find: from the list kept, no request', found.name === 'b.pdf' && drive.calls.length === 0)
  assert('the identifier of a folder', await files.folder('notes/n1') === n1 && await files.folder('') === data)
  files.forget()
  await files.find('notes/n1', 'b.pdf')
  assert('forget(): Drive is read again', drive.calls.length === 5)
})

await describe('DriveFiles — sending, replacing, copying, reading', async () => {
  const drive = new FakeDrive()
  const files = new DriveFiles({account: drive, root: ['App', 'data']})
  reports.length = 0
  const file = await files.upload('notes/n2', new TestFile(['hello'], 'hello.txt', {type: 'text/plain'}))
  assert('upload: the missing folders created', drive.at('App', 'data', 'notes', 'n2') !== null)
  assert('… the file in one request (multipart), with its name and type', drive.at('App', 'data', 'notes', 'n2', 'hello.txt')?.content === 'hello' &&
    file.name === 'hello.txt' && file.mimeType === 'text/plain' && file.size === 5 && drive.calls.filter(c => c.includes('multipart')).length === 1)
  assert('… counted in pendingWrites while it is sent', reports.join() === '1,0')
  drive.calls.length = 0
  assert('… then found without request', (await files.find('notes/n2', 'hello.txt')).id === file.id && drive.calls.length === 0)
  const again = await files.upload('notes/n2', new Blob(['bonjour'], {type: 'text/plain'}), {name: 'hello.txt'})
  assert('the same name: the content replaced, the identifier kept', again.id === file.id &&
    drive.at('App', 'data', 'notes', 'n2', 'hello.txt').content === 'bonjour' && drive.calls.at(-1) === `PATCH /upload/drive/v3/files/${file.id} media`)
  const big = 'x'.repeat(5 * 1024 * 1024 + 1)
  const large = await files.upload('notes/n2', new Blob([big], {type: 'model/stl'}), {name: 'part.stl'})
  assert('a large file: two requests (resumable), its size announced', drive.calls.slice(-2).join() ===
    'POST /upload/drive/v3/files resumable,PUT /session/new/' + encodeURIComponent(JSON.stringify({name: 'part.stl', mimeType: 'model/stl', parents: [await files.folder('notes/n2')]})) &&
    drive.lastResumable.headers['X-Upload-Content-Length'] === String(big.length) && large.size === big.length)
  await files.upload('notes/n2', new Blob([big + 'y'], {type: 'model/stl'}), {name: 'part.stl'})
  assert('… replaced in two requests too', drive.lastResumable.method === 'PATCH' && drive.at('App', 'data', 'notes', 'n2', 'part.stl').content.length === big.length + 1)
  let error = null
  try { await files.upload('notes/n2', new Blob(['x'])) } catch (e) { error = e }
  assert('a Blob without name: refused', error?.message.includes('invalid file name'))
  const copy = await files.copy(file, 'notes/n3')
  assert('copy: into a new folder, with its name', drive.at('App', 'data', 'notes', 'n3', 'hello.txt')?.content === 'bonjour' && copy.name === 'hello.txt')
  drive.calls.length = 0
  const kept = await files.copy(file, 'notes/n3')
  assert('… a file of the same name there is kept', kept.id === copy.id && drive.calls.length === 0)
  const blob = await files.read(file)
  assert('read: the content', await blob.text() === 'bonjour' && drive.calls.at(-1) === `GET /drive/v3/files/${file.id} media`)
  assert('the address in the viewer of Drive', files.viewerUrl(file) === `https://drive.google.com/file/d/${file.id}/view`)
})

await describe('DriveFiles — folders sent at the same time, source of images', async () => {
  const drive = new FakeDrive()
  const files = new DriveFiles({account: drive, root: ['App']})
  await Promise.all(['a.png', 'b.png', 'c.png'].map(name => files.upload('cards/c1', new TestFile(['img'], name, {type: 'image/png'}))))
  const folders = [...drive.files.values()].filter(f => f.mimeType === FOLDER)
  assert('three files sent together: each folder created once', folders.map(f => f.name).join() === 'App,cards,c1')
  const source = files.imageSource()
  const image = await source.load('cards/c1/b.png')
  assert('the source of images: the content of the file', await image.text() === 'img')
  assert('… a missing file: null', await source.load('cards/c1/none.png') === null && await source.load('cards/none/a.png') === null)
})

await describe('DriveFiles — the trash', async () => {
  const drive = new FakeDrive()
  const files = new DriveFiles({account: drive, root: ['App', 'data']})
  const a = await files.upload('notes/n5', new TestFile(['a'], 'a.txt'))
  await files.upload('notes/n5', new TestFile(['b'], 'b.txt'))
  await files.upload('notes/n5/sub', new TestFile(['c'], 'c.txt'))
  await files.remove(a)
  assert('remove: the file in the trash, no longer listed', drive.at('App', 'data', 'notes', 'n5', 'a.txt') === null &&
    [...drive.files.values()].find(f => f.name === 'a.txt').trashed === true && (await files.list('notes/n5')).map(f => f.name).join() === 'b.txt')
  files.forget()
  assert('… nor read again from Drive', (await files.list('notes/n5')).map(f => f.name).join() === 'b.txt')
  assert('trash: the folder in the trash', await files.trash('notes/n5') === true && [...drive.files.values()].find(f => f.name === 'n5').trashed === true)
  assert('… its files and folders forgotten', await files.find('notes/n5', 'b.txt') === null && (await files.list('notes/n5/sub')).length === 0 &&
    await files.folder('notes/n5') === null)
  assert('a missing folder: nothing to do', await files.trash('notes/none') === false)
  let error = null
  try { await files.trash('') } catch (e) { error = e }
  assert('the root cannot be put in the trash', error?.message.includes('root'))
  const again = await files.upload('notes/n5', new TestFile(['new'], 'b.txt'))
  assert('a new folder of the same name afterwards', again.name === 'b.txt' && drive.at('App', 'data', 'notes', 'n5', 'b.txt')?.content === 'new')
})

await describe('DriveFiles — move', async () => {
  const drive = new FakeDrive()
  const files = new DriveFiles({account: drive, root: ['App', 'data']})
  const a = await files.upload('prg/not/c1', new TestFile(['a'], 'a.png'))
  await files.upload('prg/not/c1/sub', new TestFile(['s'], 's.txt'))
  const folder = await files.folder('prg/not/c1')
  drive.calls.length = 0
  assert('moved: true', await files.move('prg/not/c1', 'gam/not/c2') === true)
  const moved = drive.at('App', 'data', 'gam', 'not', 'c2')
  assert('… another parent (created), another name: the same folder', moved !== null && drive.files.get(folder) === moved &&
    drive.at('App', 'data', 'prg', 'not', 'c1') === null)
  assert('… one request for the move', drive.calls.filter(call => call.startsWith('PATCH')).length === 1)
  assert('… its files and folders with it, the same identifiers', drive.at('App', 'data', 'gam', 'not', 'c2', 'a.png') === drive.files.get(a.id) &&
    drive.at('App', 'data', 'gam', 'not', 'c2', 'sub', 's.txt') !== null)
  assert('… the memory up to date', await files.folder('prg/not/c1') === null && await files.folder('gam/not/c2') === folder &&
    (await files.find('gam/not/c2', 'a.png'))?.id === a.id && (await files.list('gam/not/c2/sub')).map(f => f.name).join() === 's.txt')
  files.forget()
  assert('… and in Drive (read again)', (await files.find('gam/not/c2', 'a.png'))?.id === a.id && await files.folder('prg/not/c1') === null)
  assert('done again: nothing to do (false)', await files.move('prg/not/c1', 'gam/not/c2') === false)
  drive.calls.length = 0
  await files.move('gam/not/c2', 'gam/not/c3')
  const patch = drive.calls.find(call => call.startsWith('PATCH'))
  assert('only renamed: the same parent', drive.at('App', 'data', 'gam', 'not', 'c3') === moved && moved.parents.length === 1 && patch !== undefined)
  await files.upload('gam/not/c4', new TestFile(['x'], 'x.txt'))
  const errors = []
  for (const [from, to] of [['gam/not/c3', 'gam/not/c4'], ['gam/not/c3', 'gam/not/c3/in'], ['', 'x'], ['gam/not/c3', '']]) {
    try { await files.move(from, to) } catch (e) { errors.push(e.message) }
  }
  assert('refused: an existing target, into itself, the root', errors.length === 4 && errors[0].includes('exists') &&
    errors[1].includes('into itself') && errors[2].includes('root') && errors[3].includes('root'))
  const bare = new DriveFiles({account: drive})
  let error = null
  try { await bare.move('App', 'Other') } catch (e) { error = e }
  assert('the first folder of an empty root cannot be moved', error?.message.includes('first folder'))
})
