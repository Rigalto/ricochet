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
})
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `markdownToHtml` | function | Converts a Ricochet Markdown text to HTML. |

## Details

### markdownToHtml()

Converts a Ricochet Markdown text to HTML.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | string | Markdown text. Lines may end with `\n` or `\r\n`. |
| `options` | object | Optional hooks. |
| `options.link` | Function | Called as `link(href, html, text)` for every link. Return a string to replace the default `<a>` element, or `undefined` to keep it. `html` is the converted link text, `text` the plain one. |
| `options.task` | Function | Called as `task(done)` for every task list item. Returns the HTML of the box. Default: a disabled checkbox. |

**Returns** `string` The HTML.
