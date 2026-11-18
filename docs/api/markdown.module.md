# markdown

Module `markdown` · group `utils` · source [`src/utils/markdown.mjs`](../../src/utils/markdown.mjs)

Converts **Ricochet Markdown** to HTML. The syntax is described in `docs/MARKDOWN.md`: a subset of GitHub Flavored
Markdown that any Markdown reader displays correctly.

The conversion is a single pass over the lines. A small state remembers whether the current line belongs to a
paragraph, a list, a table, a quote or a code block; everything inside a line is handled by one regular expression.
Raw HTML is never interpreted: `<`, `>`, `&` and `"` are always escaped.

```js
import {markdownToHtml} from 'ricochet/utils/markdown.mjs'

element.innerHTML = markdownToHtml(text, {
  link: (href, html) => href.startsWith('#') ? `<a data-path="${href}">${html}</a>` : undefined,
  image: (src, alt) => src.includes(':') ? undefined : `<rc-image source="files" ref="${escapeHtml(src)}" alt="${escapeHtml(alt)}"></rc-image>`,
})
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `markdownToHtml` | function | Converts a Ricochet Markdown text to HTML. |
| `markdownToText` | function | The text that a reader sees of a Markdown text, without its marks: for counting words, indexing for a search, or a short preview. The text of a link is kept, not its address; the alternative text of an image (without its width), not its address; the content of a code; the lines of a table, cells separated by spaces. Icons (`:name:`), colors (`` `#C04F21` ``), formulas (`$$…$$`), separators and the markers of headings, quotes, lists and tasks are removed. One line of text per line of the source, the empty ones dropped. |
| `markdownTargets` | function | The addresses of the links and the images of a Markdown text, in their order, without duplicates: for checking or rewriting the links of a text. An escaped bracket (`\[`) does not start a link. |

## Details

### markdownToHtml()

Converts a Ricochet Markdown text to HTML.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | string | Markdown text. Lines may end with `\n` or `\r\n`. |
| `options` | object | Optional hooks. |
| `options.link` | Function | Called as `link(href, html, text)` for every link. Return a string to replace the default `<a>` element, or `undefined` to keep it. `html` is the converted link text, `text` the plain one. |
| `options.image` | Function | Called as `image(src, alt, width)` for every image. Return a string to replace the default `<img>` element, or `undefined` to keep it. `alt` is the plain text of the image; `width` is the width written after `\|` (`'100'`, `'50%'`), `undefined` when there is none. The values are not escaped: the hook escapes what it writes in HTML. An image whose address has an unsafe scheme is never given to the hook. |
| `options.task` | Function | Called as `task(done)` for every task list item. Returns the HTML of the box. Default: a disabled checkbox. |

**Returns** `string` The HTML.

### markdownToText()

The text that a reader sees of a Markdown text, without its marks: for counting words, indexing for a search, or a
short preview. The text of a link is kept, not its address; the alternative text of an image (without its width),
not its address; the content of a code; the lines of a table, cells separated by spaces. Icons (`:name:`), colors
(`` `#C04F21` ``), formulas (`$$…$$`), separators and the markers of headings, quotes, lists and tasks are
removed. One line of text per line of the source, the empty ones dropped.

```javascript
markdownToText('# Plan\n\nThe **new** [kitchen](#prg/not) :save: ![Plan|50%](plan.png)')
// 'Plan\nThe new kitchen Plan'
```

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | string | The Markdown text. |

**Returns** `string` The text.

### markdownTargets()

The addresses of the links and the images of a Markdown text, in their order, without duplicates: for checking or
rewriting the links of a text. An escaped bracket (`\[`) does not start a link.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | string | The Markdown text. |

**Returns** `string[]` The addresses (`#path`, `https://…`, `plan.png`…).
