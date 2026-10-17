// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// Generates the API documentation from the /** … */ blocks of the source files.
// ---------------------------------------------------------------------------
//
// Usage, from the repository root:   node tools/doc.mjs [sourceDir …]   (default: src)
// Output, rewritten at every run:     docs/api/index.json, docs/api/README.md, docs/api/<Name>.md
//
// What is documented:
// - every class (`class Name extends Base`), with the /** */ block right above it, its documented methods,
//   and the tag of the element it is bound to (`WComponent.define('tag', Name)` or `customElements.define`);
// - every module whose header block has a `@module name` tag, with the list of its exports.
// The name, the parent class and the exports are read from the code, not from the comments.
// The group is the first folder under the source directory, unless a `@category` tag says otherwise.
//
// No dependency: Node 20 or later.

import {readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync} from 'node:fs'
import {join, relative, sep, posix} from 'node:path'

const ROOT = process.cwd()
const SOURCES = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['src']
const OUT = join(ROOT, 'docs', 'api')

// tags whose first word is a name: `@attr {type} name - description`
const NAMED_TAGS = new Set(['attr', 'item', 'fires', 'listens', 'key', 'data', 'action', 'css', 'param', 'property',
  'slot'])
const KNOWN_TAGS = new Set([...NAMED_TAGS, 'module', 'category', 'element', 'extends', 'returns', 'example',
  'deprecated', 'see', 'since', 'private'])

const CLASS = /^(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+([\w.]+))?/
const METHOD = /^\s+(static\s+)?(async\s+)?(?:(get|set)\s+)?(#?\w+)\s*\(([^)]*)\)\s*\{/
const ARROW_METHOD = /^\s+(static\s+)?(#?\w+)\s*=\s*(?:async\s*)?\(?([^)=]*)\)?\s*=>/
const EXPORT = /^export\s+(?:default\s+)?(const|let|function|async\s+function|class)\s+(\w+)/
const DEFINE = /(?:WComponent|customElements)\.define\(\s*['"]([\w-]+)['"]\s*,\s*(\w+)/g
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function'])

const warnings = []
const warn = (file, line, text) => warnings.push(`${file}:${line}  ${text}`)

// ------------------------------------------------------------------ reading the sources

const listFiles = dir => readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
  const path = join(dir, entry.name)
  if (entry.isDirectory()) { return listFiles(path) }
  return entry.name.endsWith('.mjs') ? [path] : []
})

// splits a /** */ block into a Markdown description and a list of tags
const parseBlock = (lines, file, lineNumber) => {
  const body = lines.map(l => l.replace(/^\s*\/\*\*\s?/, '').replace(/\s*\*\/\s*$/, '').replace(/^\s*\*(?!\/) ?/, ''))
  const description = []
  const tags = []
  for (const line of body) {
    const tag = /^@(\w+)\s*(.*)$/.exec(line)
    if (tag !== null) {
      tags.push({tag: tag[1], body: tag[2]})
      if (!KNOWN_TAGS.has(tag[1])) { warn(file, lineNumber, `unknown tag @${tag[1]}`) }
    } else if (tags.length > 0) {
      tags.at(-1).body += `\n${line}` // continuation of the previous tag
    } else {
      description.push(line)
    }
  }
  return {description: description.join('\n').trim(), tags: tags.map(parseTag)}
}

// `{type} [name=default] (direction) - text` → {type, name, defaultValue, direction, text}
const parseTag = ({tag, body}) => {
  let rest = body
  let type = ''
  if (rest.startsWith('{')) { // the type may hold nested braces: {{module: string}}
    let depth = 0
    let end = 0
    for (; end < rest.length; end++) {
      if (rest[end] === '{') { depth += 1 }
      if (rest[end] === '}') { depth -= 1 }
      if (depth === 0) { break }
    }
    type = rest.slice(1, end).trim()
    rest = rest.slice(end + 1).trimStart()
  }
  let name = ''
  let defaultValue = ''
  let direction = ''
  if (NAMED_TAGS.has(tag)) {
    const nameMatch = /^(\[[^\]]*\]|\S+)\s*(?:\((in|out|in\/out)\)\s*)?(?:-\s+)?/.exec(rest)
    if (nameMatch !== null) {
      name = nameMatch[1]
      direction = nameMatch[2] ?? ''
      rest = rest.slice(nameMatch[0].length)
      const optional = /^\[([^=\]]+)(?:=([^\]]*))?\]$/.exec(name)
      if (optional !== null) {
        name = optional[1]
        defaultValue = optional[2] ?? ''
      }
    }
  } else {
    rest = rest.replace(/^-\s+/, '')
  }
  const text = tag === 'example' ? rest.replace(/^\n/, '') : rest.trim()
  return {tag, type, name, defaultValue, direction, text}
}

const parseFile = (path, source) => {
  const file = relative(ROOT, path).split(sep).join(posix.sep)
  const lines = readFileSync(path, 'utf8').split(/\r?\n/)
  const group = relative(source, path).split(sep).length > 1 ? relative(source, path).split(sep)[0] : 'misc'
  const entities = []
  const exportsList = []
  let currentClass = null
  let pending = null // last /** */ block, waiting for the line it documents

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*\/\*\*(?!\/)/.test(line)) { // start of a doc block
      const start = i
      while (!lines[i].includes('*/') && i < lines.length - 1) { i += 1 }
      pending = {...parseBlock(lines.slice(start, i + 1), file, start + 1), line: start + 1}
      if (pending.tags.some(t => t.tag === 'module')) { // a module header documents the whole file
        const name = pending.tags.find(t => t.tag === 'module').text || file.split('/').at(-1).replace('.mjs', '')
        entities.push({kind: 'm', name, extends: '', file, group, doc: pending, exports: exportsList, line: start + 1})
        pending = null
      }
      continue
    }
    if (/^\s*$/.test(line)) { continue }

    if (/^}/.test(line)) { currentClass = null }

    const cls = CLASS.exec(line)
    if (cls !== null) {
      currentClass = {kind: 'c', name: cls[1], extends: cls[2] ?? '', file, group, doc: pending, methods: [],
        line: i + 1}
      entities.push(currentClass)
    }

    const exp = EXPORT.exec(line)
    if (exp !== null) {
      let kind = exp[1].replace(/\s+/g, ' ')
      if (kind === 'let') { kind = 'const' }
      if (kind === 'const' && /=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>|=\s*(?:async\s+)?function\b/.test(line)) {
        kind = 'function'
      }
      exportsList.push({name: exp[2], kind, doc: pending})
    }

    if (currentClass !== null && cls === null && pending !== null) {
      const method = METHOD.exec(line)
      const arrow = method === null ? ARROW_METHOD.exec(line) : null
      if (method !== null && !KEYWORDS.has(method[4])) {
        currentClass.methods.push({name: method[4], params: method[5].trim(), isStatic: Boolean(method[1]),
          accessor: method[3] ?? '', isAsync: Boolean(method[2]), doc: pending})
      } else if (arrow !== null) {
        currentClass.methods.push({name: arrow[2], params: arrow[3].trim(), isStatic: Boolean(arrow[1]),
          accessor: '', isAsync: false, doc: pending})
      }
    }
    pending = null
  }

  // element tags bound to a class in this file
  const text = lines.join('\n')
  for (const [, tag, name] of text.matchAll(DEFINE)) {
    const entity = entities.find(e => e.kind === 'c' && e.name === name)
    if (entity !== undefined) { entity.element = tag }
  }
  return entities
}

// ------------------------------------------------------------------ writing Markdown

const cell = text => String(text ?? '').replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim()
const code = text => text === '' ? '' : `\`${text}\``
const tagsOf = (doc, name) => doc?.tags.filter(t => t.tag === name) ?? []
const firstParagraph = text => (text ?? '').split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ').trim()

// a Markdown table; a column that is empty on every row is left out
const table = (header, rows) => {
  if (rows.length === 0) { return '' }
  const kept = header.map((_, c) => c === 0 || rows.some(row => cell(row[c]) !== ''))
  const pick = row => row.filter((_, c) => kept[c])
  return [
    `| ${pick(header).join(' | ')} |`,
    `| ${pick(header).map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${pick(row).map(cell).join(' | ')} |`),
  ].join('\n')
}

const section = (title, content) => content === '' ? '' : `## ${title}\n\n${content}`

// ---------------------------------------------------------------- the Interface table: every stimulus in or out

const KINDS = ['attribute', 'event', 'window', 'item', 'key', 'data', 'action']
const DIRECTIONS = ['in', 'in/out', 'out']
// the direction written between braces for items and data: {in}, {out}, {in/out}; former {read}, {write}
const BRACE_DIRECTIONS = {in: 'in', out: 'out', 'in/out': 'in/out', read: 'in', write: 'out', readwrite: 'in/out'}

const interfaceRow = t => {
  const payload = t.type === '' ? '' : `\`${t.type}\`${t.defaultValue === '' ? '' : ` = \`${t.defaultValue}\``}`
  switch (t.tag) {
    case 'attr':
      return {kind: 'attribute', name: t.name, direction: t.direction || 'in', payload, text: t.text}
    case 'listens':
    case 'fires': {
      const isWindow = t.name.startsWith('window:')
      return {kind: isWindow ? 'window' : 'event', name: isWindow ? t.name.slice(7) : t.name,
        direction: t.direction || (t.tag === 'fires' ? 'out' : 'in'), payload, text: t.text}
    }
    case 'item':
    case 'data':
      return {kind: t.tag, name: t.name, direction: t.direction || BRACE_DIRECTIONS[t.type] || 'in', payload: '',
        text: t.text}
    case 'key':
      return {kind: 'key', name: t.name || t.type, direction: 'in', payload: '', text: t.text}
    case 'action':
      return {kind: 'action', name: t.name, direction: t.direction || 'out', payload, text: t.text}
    default:
      return null
  }
}

const interfaceSection = doc => {
  const rows = (doc?.tags ?? []).map(interfaceRow).filter(row => row !== null)
  rows.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind) ||
    DIRECTIONS.indexOf(a.direction) - DIRECTIONS.indexOf(b.direction)) // stable: source order is kept otherwise
  return section('Interface', table(['Kind', 'Name', 'Direction', 'Payload', 'Description'],
    rows.map(r => [r.kind, code(r.name), r.direction, r.payload, r.text])))
}

const tagSections = doc => [
  interfaceSection(doc),
  section('Properties', table(['Property', 'Type', 'Description'],
    tagsOf(doc, 'property').map(t => [code(t.name), t.type, t.text]))),
  section('Slots', table(['Slot', 'Description'], tagsOf(doc, 'slot').map(t => [code(t.name), t.text]))),
  section('CSS classes', table(['Class', 'Description'], tagsOf(doc, 'css').map(t => [code(t.name), t.text]))),
  section('Examples', tagsOf(doc, 'example').map(t => {
    const example = t.text.trim()
    return `\`\`\`${example.startsWith('<') ? 'html' : 'js'}\n${example}\n\`\`\``
  }).join('\n\n')),
  section('See also', tagsOf(doc, 'see').map(t => `- ${t.text}`).join('\n')),
]

// detail of a function or method: description, parameters, return value
const callable = (title, doc) => {
  const params = table(['Parameter', 'Type', 'Default', 'Description'],
    tagsOf(doc, 'param').map(t => [code(t.name), t.type, code(t.defaultValue), t.text]))
  const returns = tagsOf(doc, 'returns').map(t => `**Returns** ${t.type === '' ? '' : `\`${t.type}\` `}${t.text}`)
  const deprecated = tagsOf(doc, 'deprecated').map(t => `> **Deprecated.** ${t.text}`)
  return [`### ${title}`, ...deprecated, doc?.description ?? '', params, ...returns].filter(p => p !== '').join('\n\n')
}

const entityMarkdown = (entity, known) => {
  const doc = entity.doc
  const facts = []
  if (entity.kind === 'c') {
    const parent = entity.extends === '' ? '' : known.has(entity.extends)
      ? ` extends [\`${entity.extends}\`](${entity.extends}.md)`
      : ` extends \`${entity.extends}\``
    facts.push(`Class \`${entity.name}\`${parent}`)
    const element = tagsOf(doc, 'element')[0]?.text || entity.element
    if (element) { facts.push(`element \`<${element}>\``) }
  } else {
    facts.push(`Module \`${entity.name}\``)
  }
  facts.push(`group \`${entity.group}\``)
  facts.push(`source [\`${entity.file}\`](../../${entity.file})`)

  const parts = [`# ${entity.name}`, facts.join(' · ')]
  for (const t of tagsOf(doc, 'deprecated')) { parts.push(`> **Deprecated.** ${t.text}`) }
  parts.push(doc?.description || '*Not documented yet.*')
  parts.push(...tagSections(doc))

  if (entity.kind === 'm') {
    parts.push(section('Exports', table(['Name', 'Kind', 'Description'],
      entity.exports.map(e => [code(e.name), e.kind, firstParagraph(e.doc?.description)]))))
    // an export gets its own section when it has tags or more than one paragraph
    const detailed = entity.exports.filter(e => e.doc !== null && (e.doc.tags.length > 0 ||
      e.doc.description.replace(/\s*\n\s*/g, ' ') !== firstParagraph(e.doc.description)))
    if (detailed.length > 0) {
      parts.push('## Details', ...detailed.map(e => callable(e.kind.includes('function') ? `${e.name}()` : e.name, e.doc)))
    }
  } else if (entity.methods.length > 0) {
    parts.push('## Methods', ...entity.methods.map(m => {
      const prefix = [m.isStatic ? 'static' : '', m.accessor, m.isAsync ? 'async' : ''].filter(Boolean).join(' ')
      const signature = m.accessor === '' ? `${m.name}(${m.params})` : m.name
      return callable(`${prefix === '' ? '' : `${prefix} `}${signature}`, m.doc)
    }))
  }
  return `${parts.filter(p => p !== '').join('\n\n')}\n`
}

const indexMarkdown = entities => {
  const groups = [...new Set(entities.map(e => e.group))].sort()
  const parts = ['# API', `${entities.length} entries, generated by \`tools/doc.mjs\`. Do not edit by hand.`]
  for (const group of groups) {
    parts.push(`## ${group}`, table(['Name', 'Kind', 'Extends'], entities.filter(e => e.group === group)
      .map(e => [`[${e.name}](${e.name}.md)`, e.kind === 'c' ? 'class' : 'module', code(e.extends)])))
  }
  return `${parts.join('\n\n')}\n`
}

// ------------------------------------------------------------------ main

const entities = SOURCES.flatMap(source => listFiles(join(ROOT, source))
  .sort()
  .flatMap(path => parseFile(path, join(ROOT, source))))

for (const entity of entities) {
  const category = tagsOf(entity.doc, 'category')[0]?.text
  if (category) { entity.group = category }
  if (entity.doc === null) { warn(entity.file, entity.line, `${entity.name} is not documented`) }
}
entities.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))

const seen = new Set()
for (const entity of entities) {
  if (seen.has(entity.name)) { warn(entity.file, entity.line, `duplicate name ${entity.name}`) }
  seen.add(entity.name)
}

rmSync(OUT, {recursive: true, force: true})
mkdirSync(OUT, {recursive: true})
const known = new Set(entities.map(e => e.name))
for (const entity of entities) {
  writeFileSync(join(OUT, `${entity.name}.md`), entityMarkdown(entity, known))
}
const index = entities.map(e => ({n: e.name, k: e.kind, e: e.extends, g: e.group, s: e.file}))
writeFileSync(join(OUT, 'index.json'), `${JSON.stringify(index)}\n`)
writeFileSync(join(OUT, 'README.md'), indexMarkdown(entities))

for (const w of warnings) { console.warn(`warning  ${w}`) }
console.log(`docs/api: ${entities.length} entries (${entities.filter(e => e.kind === 'c').length} classes, ` +
  `${entities.filter(e => e.kind === 'm').length} modules), ${warnings.length} warning(s)`)
