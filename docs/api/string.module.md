# string

Module `string` · group `utils` · source [`src/utils/string.mjs`](../../src/utils/string.mjs)

Functions on texts. Their names follow lodash where it has the same function.

| Function | Result |
| --- | --- |
| `deburr(text)` | the text without accents or ligatures: `'Œuvre à Noël'` → `'Oeuvre a Noel'` |
| `foldCase(text)` | `deburr()` in lowercase: to compare or sort texts, to search in them |
| `upperFirst(text)` | the first letter in uppercase, the rest unchanged |
| `truncateMiddle(text, length)` | the text shortened to `length` characters, with `…` in the middle |
| `countWords(text, locale)` | the number of words, with the rules of Unicode for the language (`Intl.Segmenter`) |
| `indexesOf(text, search)` | every position of `search` in the text |
| `urlHost(url)` | the host of a URL, without its protocol and path: `'www.example.com'` |
| `formatNumber(value, options)` | a number written for a language: `1234567.5` → `'1 234 567,5'` in French |

To escape or unescape HTML, see `escapeHtml()` and `unescapeHtml()` in the `dom` module. To format a date for a
language, use `formatDate()` in the `date` module.

```javascript
import {foldCase} from 'ricochet/ricochet-utils.mjs'

const found = rows.filter(row => foldCase(row.title).includes(foldCase(search))) // 'noel' finds 'Noël'
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `deburr` | function | Removes the accents and splits the ligatures of Latin letters. |
| `foldCase` | function | The text without accents, in lowercase: two texts that differ only by their accents or their case give the same. |
| `upperFirst` | function | Puts the first character in uppercase. |
| `truncateMiddle` | function | Shortens a text by its middle: the start and the end stay readable (a path, a file name, a URL). |
| `countWords` | function | Counts the words of a text, with the rules of Unicode for the language (`Intl.Segmenter`): an apostrophe inside a word does not split it (`l'arbre`, `don't`), a hyphen does (`peut-être` is two words). |
| `indexesOf` | function | Every position of a string in a text. |
| `urlHost` | function | The host of a URL: the URL without its protocol, its path, its query and its port. |
| `formatNumber` | function | A number written for a language, by `Intl.NumberFormat`: the separator of thousands and the decimal mark of that language. In French: `'1 234 567,5'`, the thousands separated by a narrow no-break space (U+202F: a number is never split at the end of a line), a decimal comma, no separator inside the decimals. |

## Details

### deburr()

Removes the accents and splits the ligatures of Latin letters.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |

**Returns** `string` The text in ASCII letters, where the letters were Latin: `'Ça coûte'` → `'Ca coute'`.

### foldCase()

The text without accents, in lowercase: two texts that differ only by their accents or their case give the same.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |

**Returns** `string` `deburr(text).toLowerCase()`.

### upperFirst()

Puts the first character in uppercase.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |

**Returns** `string` The text, its first character in uppercase, the others unchanged.

### truncateMiddle()

Shortens a text by its middle: the start and the end stay readable (a path, a file name, a URL).

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |
| `length` | number | Length at most, the ellipsis included. |

**Returns** `string` The text, or its start, `…` and its end.

### countWords()

Counts the words of a text, with the rules of Unicode for the language (`Intl.Segmenter`): an apostrophe inside
a word does not split it (`l'arbre`, `don't`), a hyphen does (`peut-être` is two words).

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |
| `locale` | string | The language (`'fr'`); default: that of the browser. |

**Returns** `number` The number of words; numbers count as words, punctuation does not.

### indexesOf()

Every position of a string in a text.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |
| `search` | string | The string searched for (a character or more). |

**Returns** `number[]` The positions, in increasing order; empty if it is not found.

### urlHost()

The host of a URL: the URL without its protocol, its path, its query and its port.

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | string | The URL, with or without its protocol. |

**Returns** `string` For instance `'www.example.com'`; `''` for an empty URL.

### formatNumber()

A number written for a language, by `Intl.NumberFormat`: the separator of thousands and the decimal mark of that
language. In French: `'1 234 567,5'`, the thousands separated by a narrow no-break space (U+202F: a number is never
split at the end of a line), a decimal comma, no separator inside the decimals.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | number\|string | The number (a string is converted). |
| `options` | {locale: string, decimals: number} | `locale`: the language (`'fr-FR'`), default: that of the browser. `decimals`: the exact number of decimals (the number is rounded, zeros added); default: as needed, 3 at most. |

**Returns** `string` The number written, `''` if `value` is not a number.
