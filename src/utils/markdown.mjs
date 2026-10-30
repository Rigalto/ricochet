// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Converts **Ricochet Markdown** to HTML. The syntax is described in `docs/MARKDOWN.md`: a subset of GitHub Flavored
 * Markdown that any Markdown reader displays correctly.
 *
 * The conversion is a single pass over the lines. A small state remembers whether the current line belongs to a
 * paragraph, a list, a table, a quote or a code block; everything inside a line is handled by one regular expression.
 * Raw HTML is never interpreted: `<`, `>`, `&` and `"` are always escaped.
 *
 * ```js
 * import {markdownToHtml} from 'ricochet/utils/markdown.mjs'
 *
 * element.innerHTML = markdownToHtml(text, {
 *   link: (href, html) => href.startsWith('#') ? `<a data-path="${href}">${html}</a>` : undefined,
 * })
 * ```
 *
 * @module markdown
 */

import {escapeHtml} from './dom.mjs'

// Inline elements, in priority order (named groups: the first one defined tells which element matched)
const INLINE = new RegExp([
  /\\(?<escaped>[\\`*~[\]()|#>!_{}+.$=:-])/.source,
  /\$\$(?<math>[\s\S]+?)\$\$/.source,
  /(?<ticks>`+)(?<code>[^`]|[^`][\s\S]*?[^`])\k<ticks>(?!`)/.source,
  /\*\*(?=\S)(?<bold>[\s\S]*?\S)\*\*/.source,
  /\*(?=[^\s*])(?<italic>[\s\S]*?[^\s*])\*/.source,
  /(?<![\w=])==(?=\S)(?<mark>[\s\S]*?\S)==(?![\w=])/.source,
  /(?<![\w+])\+\+(?=\S)(?<under>[\s\S]*?\S)\+\+(?![\w+])/.source,
  /~~(?=\S)(?<strike>[\s\S]*?\S)~~/.source,
  /(?<![\w:]):(?<icon>[a-z]+):(?![\w:])/.source,
  /(?<bang>!?)\[(?<label>(?:\\.|[^\\\]])*)\]\((?<url>[^()\s]*)\)/.source,
].join('|'), 'g')

const SCHEME = /^([a-z][a-z0-9+.-]*):/i
const SAFE_SCHEMES = new Set(['http', 'https', 'mailto'])
const isSafeUrl = url => !SCHEME.test(url) || SAFE_SCHEMES.has(url.match(SCHEME)[1].toLowerCase())
const isExternal = url => /^https?:/i.test(url)
const unescapeMarkdown = text => text.replace(/\\(.)/g, '$1')
const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const IMAGE_WIDTH = /(?<!\\)\|\s*(\d+)(px|%)?\s*$/ // 'alt|100', 'alt|100px', 'alt|50%'

// a color code, `#C04F21`: the code followed by a swatch of the color
const swatch = color => `<code>${color}</code><span class="rc-md-color" style="display: inline-block; width: .8em; ` +
  `height: .8em; margin-left: .25em; border: 1px solid currentColor; border-radius: 50%; vertical-align: middle; ` +
  `background-color: ${color}"></span>`

const image = (label, url) => {
  const width = IMAGE_WIDTH.exec(label)
  const alt = escapeHtml(unescapeMarkdown(width === null ? label : label.slice(0, width.index)))
  const size = width === null ? '' : ` width="${width[1]}${width[2] === '%' ? '%' : ''}"`
  return `<img src="${escapeHtml(url)}" alt="${alt}"${size}>`
}

const inline = (text, options) => {
  let html = ''
  let last = 0
  for (const m of text.matchAll(INLINE)) {
    html += escapeHtml(text.slice(last, m.index))
    last = m.index + m[0].length
    const g = m.groups
    if (g.escaped !== undefined) {
      html += escapeHtml(g.escaped)
    } else if (g.math !== undefined) {
      html += escapeHtml(m[0]) // kept as written, for a TeX renderer such as MathJax
    } else if (g.code !== undefined) {
      const code = g.code.replace(/^ (.*) $/s, '$1')
      html += COLOR.test(code) ? swatch(code) : `<code>${escapeHtml(code)}</code>`
    } else if (g.bold !== undefined) {
      html += `<strong>${inline(g.bold, options)}</strong>`
    } else if (g.italic !== undefined) {
      html += `<em>${inline(g.italic, options)}</em>`
    } else if (g.mark !== undefined) {
      html += `<mark>${inline(g.mark, options)}</mark>`
    } else if (g.under !== undefined) {
      html += `<u>${inline(g.under, options)}</u>`
    } else if (g.strike !== undefined) {
      html += `<del>${inline(g.strike, options)}</del>`
    } else if (g.icon !== undefined) {
      html += `<rc-icon icon="${g.icon}" size="1.2em"></rc-icon>`
    } else {
      const {bang, label, url} = g
      if (!isSafeUrl(url)) {
        html += escapeHtml(m[0])
      } else if (bang === '!') {
        html += image(label, url)
      } else {
        const content = inline(label, options)
        const custom = options.link?.(url, content, unescapeMarkdown(label))
        const target = isExternal(url) ? ' target="_blank" rel="noopener"' : ''
        html += custom ?? `<a href="${escapeHtml(url)}"${target}>${content}</a>`
      }
    }
  }
  return html + escapeHtml(text.slice(last))
}

// the parts of a paragraph between hard line breaks (a line ending with '\'), formulas left whole
const HARD_BREAK = /\$\$[\s\S]*?\$\$|\\\n/g
const splitHardBreaks = text => {
  const parts = []
  let start = 0
  for (const m of text.matchAll(HARD_BREAK)) {
    if (m[0].startsWith('$$')) { continue }
    parts.push(text.slice(start, m.index))
    start = m.index + m[0].length
  }
  parts.push(text.slice(start))
  return parts
}

const FENCE = /^\s*```\s*([\w+-]*)/
const BLANK = /^\s*$/
const LIST_ITEM = /^(\s*)([-*]|\d+[.)])\s+(.*)$/
const TASK = /^\[([ xX])\]\s+/
const HEADING = /^(#{1,4})\s+(.*?)(?:\s+#+)?\s*$/
const RULE = /^\s*(?:-{3,}|\*{3,})\s*$/
const QUOTE = /^\s*>\s?(.*)$/
const TABLE_ROW = /^\s*\|/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/
const MATH_OPEN = /^\s*\$\$/ // a formula that starts a line
const CELL_SEPARATOR = /(?<!\\)\|/

// cells of a table row; an escaped '\|' is a literal '|', even inside code
const splitCells = line => line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(CELL_SEPARATOR)
  .map(cell => cell.trim().replaceAll('\\|', '|'))

const alignment = cell => {
  const left = cell.startsWith(':')
  const right = cell.endsWith(':')
  if (left && right) { return ' style="text-align: center"' }
  if (right) { return ' style="text-align: right"' }
  return left ? ' style="text-align: left"' : ''
}

/**
 * Converts a Ricochet Markdown text to HTML.
 * @param {string} source - Markdown text. Lines may end with `\n` or `\r\n`.
 * @param {object} [options] - Optional hooks.
 * @param {Function} [options.link] - Called as `link(href, html, text)` for every link. Return a string to replace the
 *   default `<a>` element, or `undefined` to keep it. `html` is the converted link text, `text` the plain one.
 * @param {Function} [options.task] - Called as `task(done)` for every task list item. Returns the HTML of the box.
 *   Default: a disabled checkbox.
 * @returns {string} The HTML.
 */
export const markdownToHtml = (source, options = {}) => {
  const lines = String(source ?? '').split(/\r?\n/)
  const html = []
  let paragraph = null // lines of the current paragraph
  let quote = null // lines of the current quote, converted recursively
  let code = null // {lang, lines} of the current code block
  let table = null // {align} of the current table
  let math = null // lines of a formula written over several lines, kept as written
  const lists = [] // open lists, innermost last: {tag, indent, item}
  let listGap = false // a blank line was seen inside a list: the list goes on only if another item follows

  const task = done => options.task?.(done) ?? `<input type="checkbox" disabled${done ? ' checked' : ''}> `

  const closeParagraph = () => {
    if (paragraph === null) { return }
    // the whole paragraph is converted at once, so that bold or a link may span several source lines;
    // a line ending with '\' is a hard line break
    const content = splitHardBreaks(paragraph.join('\n')).map(part => inline(part, options)).join('<br>\n')
    html.push(`<p>${content}</p>`)
    paragraph = null
  }

  const closeQuote = () => {
    if (quote === null) { return }
    html.push(`<blockquote>${markdownToHtml(quote.join('\n'), options)}</blockquote>`)
    quote = null
  }

  const closeTable = () => {
    if (table === null) { return }
    html.push('</tbody></table>')
    table = null
  }

  // writes the pending text of the innermost list item, without closing it (a nested list may follow)
  const flushItem = () => {
    const list = lists.at(-1)
    if (list?.item === undefined) { return }
    let text = list.item
    let box = ''
    const isTask = TASK.exec(text)
    if (list.tag === 'ul' && isTask !== null) {
      box = task(isTask[1] !== ' ')
      text = text.slice(isTask[0].length)
    }
    html.push(`<li${box === '' ? '' : ' class="task"'}>${box}${inline(text, options)}`)
    list.item = undefined
  }

  const closeList = () => {
    flushItem()
    html.push(`</li></${lists.pop().tag}>`)
  }

  const closeLists = () => { while (lists.length > 0) { closeList() } }

  const closeAll = () => {
    closeParagraph()
    closeQuote()
    closeTable()
    closeLists()
  }

  const openItem = (indent, marker, text) => {
    const tag = /\d/.test(marker) ? 'ol' : 'ul'
    while (lists.length > 0 && lists.at(-1).indent > indent) { closeList() }
    const current = lists.at(-1)
    if (current !== undefined && current.indent === indent && current.tag !== tag) { closeList() }
    const list = lists.at(-1)
    if (list === undefined || list.indent < indent) {
      flushItem()
      const start = tag === 'ol' && parseInt(marker, 10) !== 1 ? ` start="${parseInt(marker, 10)}"` : ''
      html.push(`<${tag}${start}>`)
      lists.push({tag, indent, item: text})
    } else {
      flushItem()
      html.push('</li>')
      list.item = text
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (math !== null) {
      math.push(line)
      if (line.includes('$$')) {
        html.push(`<p>${escapeHtml(math.join('\n'))}</p>`)
        math = null
      }
      continue
    }

    if (code !== null) {
      if (FENCE.test(line) && line.trim() === '```') {
        const lang = code.lang === '' ? '' : ` class="language-${escapeHtml(code.lang)}"`
        html.push(`<pre><code${lang}>${escapeHtml(code.lines.join('\n'))}</code></pre>`)
        code = null
      } else {
        code.lines.push(line)
      }
      continue
    }

    const fence = FENCE.exec(line)
    if (fence !== null) {
      closeAll()
      code = {lang: fence[1], lines: []}
      continue
    }

    // a formula opened at the start of a line and not closed on it: its lines are not Markdown
    if (MATH_OPEN.test(line) && line.split('$$').length % 2 === 0) {
      closeAll()
      math = [line]
      continue
    }

    if (BLANK.test(line)) {
      closeParagraph()
      closeQuote()
      closeTable()
      listGap = lists.length > 0
      continue
    }

    const item = LIST_ITEM.exec(line)
    if (item !== null && !RULE.test(line)) {
      closeParagraph()
      closeQuote()
      closeTable()
      listGap = false
      openItem(item[1].length, item[2], item[3])
      continue
    }

    if (listGap) { // the blank line ended the list
      closeLists()
      listGap = false
    }

    if (lists.length > 0 && /^\s{2,}\S/.test(line) && lists.at(-1).item !== undefined) {
      lists.at(-1).item += ` ${line.trim()}` // continuation of the current list item
      continue
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      closeAll()
      html.push(`<h${heading[1].length}>${inline(heading[2], options)}</h${heading[1].length}>`)
      continue
    }

    if (RULE.test(line)) {
      closeAll()
      html.push('<hr>')
      continue
    }

    const quoted = QUOTE.exec(line)
    if (quoted !== null) {
      if (quote === null) {
        closeAll()
        quote = []
      }
      quote.push(quoted[1])
      continue
    }

    if (TABLE_ROW.test(line)) {
      if (table === null && TABLE_SEPARATOR.test(lines[i + 1] ?? '')) {
        closeAll()
        const align = splitCells(lines[i + 1]).map(alignment)
        const head = splitCells(line).map((cell, c) => `<th${align[c] ?? ''}>${inline(cell, options)}</th>`)
        html.push(`<table><thead><tr>${head.join('')}</tr></thead><tbody>`)
        table = {align}
        i += 1 // the separator line is consumed
        continue
      }
      if (table !== null) {
        const cells = splitCells(line).map((cell, c) => `<td${table.align[c] ?? ''}>${inline(cell, options)}</td>`)
        html.push(`<tr>${cells.join('')}</tr>`)
        continue
      }
    }

    if (paragraph === null) {
      closeAll()
      paragraph = []
    }
    paragraph.push(line.trim())
  }

  if (math !== null) { // unterminated formula: keep its content
    html.push(`<p>${escapeHtml(math.join('\n'))}</p>`)
  }
  if (code !== null) { // unterminated code block: keep its content
    html.push(`<pre><code>${escapeHtml(code.lines.join('\n'))}</code></pre>`)
  }
  closeAll()
  return html.join('\n')
}
