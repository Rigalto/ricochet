// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Functions on texts. Their names follow lodash where it has the same function.
 *
 * | Function | Result |
 * | --- | --- |
 * | `deburr(text)` | the text without accents or ligatures: `'Œuvre à Noël'` → `'Oeuvre a Noel'` |
 * | `foldCase(text)` | `deburr()` in lowercase: to compare or sort texts, to search in them |
 * | `upperFirst(text)` | the first letter in uppercase, the rest unchanged |
 * | `truncateMiddle(text, length)` | the text shortened to `length` characters, with `…` in the middle |
 * | `countWords(text, locale)` | the number of words, with the rules of Unicode for the language (`Intl.Segmenter`) |
 * | `indexesOf(text, search)` | every position of `search` in the text |
 * | `urlHost(url)` | the host of a URL, without its protocol and path: `'www.example.com'` |
 *
 * To escape or unescape HTML, see `escapeHtml()` and `unescapeHtml()` in the `dom` module. To format a number or a
 * date for a language, use `Intl.NumberFormat` and `formatDate()` in the `date` module.
 *
 * ```javascript
 * import {foldCase} from 'ricochet/ricochet-utils.mjs'
 *
 * const found = rows.filter(row => foldCase(row.title).includes(foldCase(search))) // 'noel' finds 'Noël'
 * ```
 *
 * @module string
 */

// letters that the Unicode decomposition does not split (as lodash does)
const LETTERS = {Æ: 'Ae', æ: 'ae', Œ: 'Oe', œ: 'oe', ß: 'ss', Ø: 'O', ø: 'o', Ł: 'L', ł: 'l', Đ: 'D', đ: 'd', Ð: 'D',
  ð: 'd', Þ: 'Th', þ: 'th', Ħ: 'H', ħ: 'h', ı: 'i', Ŀ: 'L', ŀ: 'l', ſ: 's'}
const LETTERS_REGEX = new RegExp(`[${Object.keys(LETTERS).join('')}]`, 'g')
const MARKS = /[̀-ͯ]/g

/**
 * Removes the accents and splits the ligatures of Latin letters.
 * @param {string} text - The text.
 * @returns {string} The text in ASCII letters, where the letters were Latin: `'Ça coûte'` → `'Ca coute'`.
 */
export const deburr = text => String(text).normalize('NFD').replace(MARKS, '').replace(LETTERS_REGEX, c => LETTERS[c])

/**
 * The text without accents, in lowercase: two texts that differ only by their accents or their case give the same.
 * @param {string} text - The text.
 * @returns {string} `deburr(text).toLowerCase()`.
 */
export const foldCase = text => deburr(text).toLowerCase()

/**
 * Puts the first character in uppercase.
 * @param {string} text - The text.
 * @returns {string} The text, its first character in uppercase, the others unchanged.
 */
export const upperFirst = text => {
  const s = String(text)
  if (s === '') { return s }
  const first = String.fromCodePoint(s.codePointAt(0))
  return first.toUpperCase() + s.slice(first.length)
}

/**
 * Shortens a text by its middle: the start and the end stay readable (a path, a file name, a URL).
 * @param {string} text - The text.
 * @param {number} length - Length at most, the ellipsis included.
 * @returns {string} The text, or its start, `…` and its end.
 */
export const truncateMiddle = (text, length) => {
  const s = String(text)
  if (s.length <= length) { return s }
  const kept = Math.max(0, length - 1)
  const start = Math.ceil(kept / 2)
  return s.slice(0, start) + '…' + s.slice(s.length - (kept - start))
}

/**
 * Counts the words of a text, with the rules of Unicode for the language (`Intl.Segmenter`): an apostrophe inside
 * a word does not split it (`l'arbre`, `don't`), a hyphen does (`peut-être` is two words).
 * @param {string} text - The text.
 * @param {string} [locale] - The language (`'fr'`); default: that of the browser.
 * @returns {number} The number of words; numbers count as words, punctuation does not.
 */
export const countWords = (text, locale) => {
  let count = 0
  for (const segment of new Intl.Segmenter(locale, {granularity: 'word'}).segment(String(text))) {
    if (segment.isWordLike) { count++ }
  }
  return count
}

/**
 * Every position of a string in a text.
 * @param {string} text - The text.
 * @param {string} search - The string searched for (a character or more).
 * @returns {number[]} The positions, in increasing order; empty if it is not found.
 */
export const indexesOf = (text, search) => {
  const indexes = []
  if (search === '') { return indexes }
  let index = text.indexOf(search)
  while (index !== -1) {
    indexes.push(index)
    index = text.indexOf(search, index + 1)
  }
  return indexes
}

/**
 * The host of a URL: the URL without its protocol, its path, its query and its port.
 * @param {string} url - The URL, with or without its protocol.
 * @returns {string} For instance `'www.example.com'`; `''` for an empty URL.
 */
export const urlHost = url => {
  if (url === undefined || url === null || url === '') { return '' }
  const s = String(url).trim()
  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(s) ? s : `http://${s}`).hostname
  } catch {
    return s.replace(/^[a-z][a-z\d+.-]*:\/\//i, '').replace(/[/?#:].*$/, '')
  }
}
