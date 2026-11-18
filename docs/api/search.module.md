# search

Module `search` · group `utils` · source [`src/utils/search.mjs`](../../src/utils/search.mjs)

A full-text search made simple: the terms of a text (`searchTerms`), kept with the record that holds them, and an
index that finds the records holding all the terms of a query, each one as the beginning of a word
(`SearchIndex`).

```javascript
import {searchTerms, SearchIndex, STOP_WORDS_FR} from 'ricochet/ricochet-utils.mjs'

const terms = searchTerms('Le compactage du sol, puis compacter les bords', {stopWords: STOP_WORDS_FR})
// ['bords', 'compactage', 'compacter', 'puis', 'sol']
const index = new SearchIndex({stopWords: STOP_WORDS_FR})
index.set('n42', terms)
index.query('Compact SOL') // ['n42']
```

## The terms of a text

The text is put in lowercase without accents (`foldCase`), then cut on everything that is neither a letter nor a
digit (punctuation, apostrophes, hyphens, the marks of Markdown: `l'arrosage` gives `arrosage`, `porte-fenêtre`
gives `porte` and `fenetre`). The words shorter than `minLength` (3 by default) and the stop words are dropped, and
so is a word that begins another one: the search is made by the beginning of words, so `compactage` is enough for
`compact` and `compactage` (and a plural keeps the singular: `pompes` for `pompe`; a query `pompes` does not find
`pompe`, the user types the shorter word). A word merely contained in another is kept (`pact` in `compact`: a query
`pact` would not find `compact`). The terms are sorted: stored with the record (a cell, separated by spaces), they
make the index without going back to the text.

For a Markdown text, `markdownToText` first: the addresses of the links and images are not words of the text.

## The query

The query is cut by the same rules (`searchTerms`, with the options of the index): a record is found when each term
of the query begins one of its terms. A query without any term (only short words, or stop words) finds nothing.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `STOP_WORDS_FR` | const | French stop words (without accents, 3 letters or more): articles, pronouns, prepositions, conjunctions, the most common forms of `être`, `avoir`, `faire`, `pouvoir`; found in nearly every text, they sort nothing. An array of strings. |
| `STOP_WORDS_EN` | const | English stop words (3 letters or more): articles, pronouns, prepositions, conjunctions, the most common forms of `be`, `have`, `do` and the modal verbs. An array of strings. |
| `searchTerms` | function | The search terms of a text: in lowercase without accents, cut on what is neither a letter nor a digit, without the short words, the stop words, nor the words that begin another one; sorted. |
| `SearchIndex` | class | An index of records by their search terms; a query finds the records holding all its terms. |

## Details

### searchTerms()

The search terms of a text: in lowercase without accents, cut on what is neither a letter nor a digit, without the
short words, the stop words, nor the words that begin another one; sorted.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text (for Markdown: `markdownToText(text)` first). |
| `options` | object | Options. |
| `options.minLength` | number | The shortest word kept (default 3). |
| `options.stopWords` | string[]\|Set<string> | The words never kept (`STOP_WORDS_FR`, `STOP_WORDS_EN`…). |

**Returns** `string[]` The terms.
