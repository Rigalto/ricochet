// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-markdown.mjs — node tests/run.mjs Markdown
// The conversion of Ricochet Markdown to HTML (src/utils/markdown.mjs), as described in docs/MARKDOWN.md.

import {describe, assert} from './kernel.mjs'
import {markdownToHtml} from '../src/utils/markdown.mjs'

const md = (text, options) => markdownToHtml(text, options)
const p = html => `<p>${html}</p>`

describe('Markdown — blocks', () => {
  assert('paragraph, lines joined', md('a\nb') === p('a\nb'))
  assert('two paragraphs', md('a\n\nb') === `${p('a')}\n${p('b')}`)
  assert('hard line break', md('a\\\nb') === p('a<br>\nb'))
  assert('headings 1 to 4', md('# A\n#### D') === '<h1>A</h1>\n<h4>D</h4>')
  assert('5 # is a paragraph', md('##### E') === p('##### E'))
  assert('bullet list', md('- a\n- b') === '<ul>\n<li>a\n</li>\n<li>b\n</li></ul>')
  assert('nested list', /<ul>.*<li>a.*<ul>.*<li>b/s.test(md('- a\n  - b')))
  assert('numbered list with start', md('3. a').startsWith('<ol start="3">'))
  assert('task list', md('- [x] done').includes('<input type="checkbox" disabled checked> done'))
  assert('task hook', md('- [ ] todo', {task: done => `[${done}]`}).includes('[false]todo'))
  assert('quote', md('> a\n> b') === `<blockquote>${p('a\nb')}</blockquote>`)
  assert('code block', md('```js\na < b\n```') === '<pre><code class="language-js">a &lt; b</code></pre>')
  assert('separator', md('a\n\n---') === `${p('a')}\n<hr>`)
  const table = md('| a | b |\n| :--- | ---: |\n| 1 | 2 |')
  assert('table', table.includes('<th style="text-align: left">a</th>') && table.includes('<td style="text-align: right">2</td>'))
})

describe('Markdown — inline', () => {
  assert('bold', md('**a**') === p('<strong>a</strong>'))
  assert('italic', md('*a*') === p('<em>a</em>'))
  assert('strikethrough', md('~~a~~') === p('<del>a</del>'))
  assert('code', md('`a*b*`') === p('<code>a*b*</code>'))
  assert('no emphasis with _', md('table_sort_field') === p('table_sort_field'))
  assert('raw HTML escaped', md('<b>') === p('&lt;b&gt;'))
  assert('escaped character', md('\\*a\\*') === p('*a*'))
  assert('link', md('[a](https://x.org)') === p('<a href="https://x.org" target="_blank" rel="noopener">a</a>'))
  assert('application link', md('[a](#u/b)') === p('<a href="#u/b">a</a>'))
  assert('link hook', md('[a](#u)', {link: href => `<x>${href}</x>`}) === p('<x>#u</x>'))
  assert('unsafe scheme shown as text', md('[a](javascript:x)') === p('[a](javascript:x)'))
  assert('image', md('![a b](i.png)') === p('<img src="i.png" alt="a b">'))
})

describe('Markdown — highlight and underline', () => {
  assert('highlight', md('==a b==') === p('<mark>a b</mark>'))
  assert('highlight with bold inside', md('==**a**==') === p('<mark><strong>a</strong></mark>'))
  assert('a == b untouched', md('a == b == c') === p('a == b == c'))
  assert('x==y==z untouched', md('x==y==z') === p('x==y==z'))
  assert('underline', md('++a b++') === p('<u>a b</u>'))
  assert('C++ untouched', md('C++11 and C++14') === p('C++11 and C++14'))
  assert('i++ untouched', md('i++ then j++') === p('i++ then j++'))
  assert('escaped', md('\\==a==') === p('==a=='))
})

describe('Markdown — icons', () => {
  assert('icon', md('see :checksquare: here') === p('see <rc-icon icon="checksquare" size="1.2em"></rc-icon> here'))
  assert('icon at the start', md(':save:') === p('<rc-icon icon="save" size="1.2em"></rc-icon>'))
  assert('time untouched', md('10:30:00') === p('10:30:00'))
  assert('uppercase untouched', md(':Save:') === p(':Save:'))
  assert('digits untouched', md(':h1:') === p(':h1:'))
  assert('inside a word untouched', md('a:b:c') === p('a:b:c'))
  assert('URL untouched', md('https://x.org') === p('https://x.org'))
  assert('escaped', md('\\:save:') === p(':save:'))
  assert('not in code', md('`:save:`') === p('<code>:save:</code>'))
})

describe('Markdown — colors', () => {
  const html = md('`#C04F21`')
  assert('code and swatch', html.startsWith('<p><code>#C04F21</code><span class="rc-md-color"') &&
    html.includes('background-color: #C04F21'))
  assert('3 digits', md('`#fff`').includes('background-color: #fff'))
  assert('not a color', md('`#C04F2`') === p('<code>#C04F2</code>'))
})

describe('Markdown — image width', () => {
  assert('pixels', md('![a|100](i.png)') === p('<img src="i.png" alt="a" width="100">'))
  assert('px suffix', md('![a|100px](i.png)') === p('<img src="i.png" alt="a" width="100">'))
  assert('percent', md('![a|50%](i.png)') === p('<img src="i.png" alt="a" width="50%">'))
  assert('escaped bar', md('![a\\|100](i.png)') === p('<img src="i.png" alt="a|100">'))
  assert('link text untouched', md('[a|100](#x)') === p('<a href="#x">a|100</a>'))
})

describe('Markdown — formulas', () => {
  assert('kept as written', md('$$\\{x_1 * y\\}$$') === p('$$\\{x_1 * y\\}$$'))
  assert('escaped HTML inside', md('$$a<b$$') === p('$$a&lt;b$$'))
  assert('inside a sentence', md('so **b** $$x^2$$ c') === p('so <strong>b</strong> $$x^2$$ c'))
  assert('\\\\ at the end of a line', md('$$a \\\\\nb$$') === p('$$a \\\\\nb$$'))
  assert('formula over several lines', md('$$\n- a\n# b\n\n$$') === p('$$\n- a\n# b\n\n$$'))
  assert('then Markdown again', md('$$\nx\n$$\n- a') === `${p('$$\nx\n$$')}\n<ul>\n<li>a\n</li></ul>`)
  assert('escaped dollars', md('\\$\\$a\\$\\$') === p('$$a$$'))
})
