# dom

Module `dom` · group `utils` · source [`src/utils/dom.mjs`](../../src/utils/dom.mjs)

Small helpers around the DOM and the browser: escaping text for HTML, building elements from HTML strings,
sanitizing HTML of external origin, and the clipboard.

## Which tool for which data

| Situation | Tool |
| --- | --- |
| Write a value into an existing node | `element.textContent` or `setAttribute` |
| Insert a value into an HTML template (`innerHTML`) | `escapeHtml()` |
| Display a Markdown text | `markdownToHtml()` in `utils/markdown.mjs` |
| Display HTML or SVG of external origin | `sanitizeHtml()` |

## Sanitizing

Ricochet has no dependency, so it does not sanitize HTML by itself. The application registers its sanitizer once,
at startup, for instance with DOMPurify:

```js
import {setSanitizer} from 'ricochet/utils/dom.mjs'

setSanitizer(html => DOMPurify.sanitize(html, {ADD_TAGS: ['use'], ADD_ATTR: ['target', 'icon', 'as']}))
```

Until a sanitizer is registered, `sanitizeHtml()` escapes its input: the HTML is shown as text, never run.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `escapeHtml` | function | Escapes `&`, `<`, `>` and `"` so that a text can be inserted in HTML, inside an element or an attribute. |
| `setSanitizer` | function | Registers the function used by `sanitizeHtml()`. Called once by the application, at startup. |
| `sanitizeHtml` | function | Removes the dangerous parts (scripts, event handlers, `javascript:` links) of an HTML string of external origin, with the sanitizer registered by `setSanitizer()`. Without a registered sanitizer, the input is escaped. |
| `createElementFromHTML` | function | Builds an element from an HTML string, without inserting it in the page. A `<template>` is used, so images are not loaded and elements such as `<tr>` or `<option>` are accepted. |
| `createSvgElementFromHTML` | function | Builds an SVG element (`<path>`, `<g>`, `<circle>`…) from a string, in the SVG namespace, without inserting it in the page. |
| `readClipboard` | function | Reads the text of the clipboard. The browser may ask the user for permission. |
| `writeClipboard` | function | Writes a text in the clipboard. |
| `svgToWidthHeight` | function | Reads the size of an SVG image from the `viewBox` attribute of its source. |

## Details

### escapeHtml()

Escapes `&`, `<`, `>` and `"` so that a text can be inserted in HTML, inside an element or an attribute.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | Text to escape. |

**Returns** `string` The escaped text.

### setSanitizer()

Registers the function used by `sanitizeHtml()`. Called once by the application, at startup.

| Parameter | Type | Description |
| --- | --- | --- |
| `fn` | Function | Receives an HTML string, returns the sanitized HTML string. |

### sanitizeHtml()

Removes the dangerous parts (scripts, event handlers, `javascript:` links) of an HTML string of external origin,
with the sanitizer registered by `setSanitizer()`. Without a registered sanitizer, the input is escaped.

| Parameter | Type | Description |
| --- | --- | --- |
| `html` | string | HTML to sanitize. |

**Returns** `string` HTML safe to insert with `innerHTML`.

### createElementFromHTML()

Builds an element from an HTML string, without inserting it in the page. A `<template>` is used, so images are not
loaded and elements such as `<tr>` or `<option>` are accepted.

| Parameter | Type | Description |
| --- | --- | --- |
| `html` | string | HTML of one element. Only the first element is returned. |

**Returns** `Element|null` The element, or `null` if the string holds none.

### createSvgElementFromHTML()

Builds an SVG element (`<path>`, `<g>`, `<circle>`…) from a string, in the SVG namespace, without inserting it in
the page.

| Parameter | Type | Description |
| --- | --- | --- |
| `html` | string | SVG markup of one element. Only the first element is returned. |

**Returns** `Element|null` The SVG element, or `null` if the string holds none.

### readClipboard()

Reads the text of the clipboard. The browser may ask the user for permission.

| Parameter | Type | Description |
| --- | --- | --- |
| `recall` | Function | Called with the text. Optional: the text is also returned as a promise. |

**Returns** `Promise<string>` The text of the clipboard; rejected if the clipboard is not available.

### writeClipboard()

Writes a text in the clipboard.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | Text to copy. |

**Returns** `Promise<void>` Resolved once the text is copied; rejected if the clipboard is not available.

### svgToWidthHeight()

Reads the size of an SVG image from the `viewBox` attribute of its source.

| Parameter | Type | Description |
| --- | --- | --- |
| `svg` | string | Source of the SVG image. |

**Returns** `{width: number, height: number}|null` The size, or `null` if there is no valid `viewBox`.
