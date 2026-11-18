// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A full-text search made simple: the terms of a text (`searchTerms`), kept with the record that holds them, and an
 * index that finds the records holding all the terms of a query, each one as the beginning of a word
 * (`SearchIndex`).
 *
 * ```javascript
 * import {searchTerms, SearchIndex, STOP_WORDS_FR} from 'ricochet/ricochet-utils.mjs'
 *
 * const terms = searchTerms('Le compactage du sol, puis compacter les bords', {stopWords: STOP_WORDS_FR})
 * // ['bords', 'compactage', 'compacter', 'puis', 'sol']
 * const index = new SearchIndex({stopWords: STOP_WORDS_FR})
 * index.set('n42', terms)
 * index.query('Compact SOL') // ['n42']
 * ```
 *
 * ## The terms of a text
 *
 * The text is put in lowercase without accents (`foldCase`), then cut on everything that is neither a letter nor a
 * digit (punctuation, apostrophes, hyphens, the marks of Markdown: `l'arrosage` gives `arrosage`, `porte-fenêtre`
 * gives `porte` and `fenetre`). The words shorter than `minLength` (3 by default) and the stop words are dropped, and
 * so is a word that begins another one: the search is made by the beginning of words, so `compactage` is enough for
 * `compact` and `compactage` (and a plural keeps the singular: `pompes` for `pompe`; a query `pompes` does not find
 * `pompe`, the user types the shorter word). A word merely contained in another is kept (`pact` in `compact`: a query
 * `pact` would not find `compact`). The terms are sorted: stored with the record (a cell, separated by spaces), they
 * make the index without going back to the text.
 *
 * For a Markdown text, `markdownToText` first: the addresses of the links and images are not words of the text.
 *
 * ## The query
 *
 * The query is cut by the same rules (`searchTerms`, with the options of the index): a record is found when each term
 * of the query begins one of its terms. A query without any term (only short words, or stop words) finds nothing.
 *
 * @module search
 * @category utils
 */

import {foldCase} from './string.mjs'

// a word: letters and digits of any script
const WORD = /[\p{L}\p{N}]+/gu

/**
 * French stop words (without accents, 3 letters or more): articles, pronouns, prepositions, conjunctions, the most
 * common forms of `être`, `avoir`, `faire`, `pouvoir`; found in nearly every text, they sort nothing. An array of
 * strings.
 */
export const STOP_WORDS_FR = [
  'les', 'des', 'une', 'uns', 'unes', 'aux', 'ces', 'cet', 'cette', 'ceux', 'celle', 'celles', 'celui', 'son', 'ses',
  'leur', 'leurs', 'mon', 'mes', 'ton', 'tes', 'notre', 'nos', 'votre', 'vos', 'qui', 'que', 'quoi', 'dont', 'quel',
  'quelle', 'quels', 'quelles', 'lui', 'elle', 'elles', 'ils', 'eux', 'nous', 'vous', 'moi', 'toi', 'soi', 'dans',
  'pour', 'avec', 'sans', 'sur', 'sous', 'par', 'chez', 'vers', 'entre', 'depuis', 'pendant', 'avant', 'apres', 'mais',
  'donc', 'car', 'puis', 'ainsi', 'alors', 'aussi', 'comme', 'quand', 'lorsque', 'parce', 'pas', 'plus', 'moins',
  'tres', 'trop', 'peu', 'bien', 'tout', 'tous', 'toute', 'toutes', 'meme', 'memes', 'autre', 'autres', 'chaque',
  'est', 'sont', 'etre', 'ete', 'etait', 'etaient', 'sera', 'seront', 'serait', 'soit', 'avoir', 'ont',
  'avait', 'avaient', 'aura', 'auront', 'aurait', 'fait', 'faire', 'font', 'peut', 'peuvent', 'pourrait', 'cela',
  'ceci', 'ici', 'non', 'oui', 'encore', 'deja', 'ensuite', 'enfin', 'selon', 'tant', 'tel', 'telle', 'tels', 'telles'
]

/**
 * English stop words (3 letters or more): articles, pronouns, prepositions, conjunctions, the most common forms of
 * `be`, `have`, `do` and the modal verbs. An array of strings.
 */
export const STOP_WORDS_EN = [
  'the', 'and', 'for', 'with', 'without', 'that', 'this', 'these', 'those', 'from', 'into', 'onto', 'over', 'under',
  'are', 'was', 'were', 'been', 'being', 'has', 'have', 'had', 'does', 'did', 'done', 'not', 'but', 'you', 'your',
  'its', 'our', 'their', 'they', 'them', 'she', 'her', 'his', 'him', 'can', 'could', 'will', 'would', 'shall',
  'should', 'may', 'might', 'must', 'than', 'then', 'there', 'here', 'which', 'what', 'when', 'where', 'who', 'whom',
  'why', 'how', 'also', 'only', 'very', 'more', 'most', 'such', 'each', 'other', 'any', 'all', 'some', 'about',
  'after', 'before', 'between', 'through', 'while', 'because', 'just', 'yet', 'both', 'either', 'neither'
]

// the stop words given, folded, as a Set (kept for the same array)
const stopSets = new WeakMap()
const stopSet = words => {
  if (words === undefined || words === null) { return new Set() }
  if (words instanceof Set) { return words }
  let set = stopSets.get(words)
  if (set === undefined) {
    set = new Set(words.map(word => foldCase(word)))
    stopSets.set(words, set)
  }
  return set
}

/**
 * The search terms of a text: in lowercase without accents, cut on what is neither a letter nor a digit, without the
 * short words, the stop words, nor the words that begin another one; sorted.
 * @param {string} text - The text (for Markdown: `markdownToText(text)` first).
 * @param {object} [options] - Options.
 * @param {number} [options.minLength] - The shortest word kept (default 3).
 * @param {string[]|Set<string>} [options.stopWords] - The words never kept (`STOP_WORDS_FR`, `STOP_WORDS_EN`…).
 * @returns {string[]} The terms.
 */
export const searchTerms = (text, {minLength = 3, stopWords} = {}) => {
  const stops = stopSet(stopWords)
  const words = [...new Set(foldCase(String(text ?? '')).match(WORD) ?? [])]
    .filter(word => word.length >= minLength && !stops.has(word))
    .sort()
  // sorted: a word that begins others is right before the first of them
  return words.filter((word, index) => !(words[index + 1]?.startsWith(word)))
}

/** An index of records by their search terms; a query finds the records holding all its terms. */
export class SearchIndex {
  #options
  #records = new Map() // id → terms
  #postings = new Map() // term → Set of ids
  #sorted = null // the terms, sorted (built again after a change)

  /**
   * @param {object} [options] - The rules of the queries (those of `searchTerms`).
   * @param {number} [options.minLength] - The shortest word of a query (default 3).
   * @param {string[]|Set<string>} [options.stopWords] - The words ignored in a query.
   */
  constructor ({minLength = 3, stopWords} = {}) {
    this.#options = {minLength, stopWords}
  }

  /** The number of records. */
  get size () { return this.#records.size }

  /**
   * Puts a record in the index, or replaces its terms.
   * @param {string} id - The identifier of the record.
   * @param {string[]|string} terms - Its terms (`searchTerms`), or the terms separated by spaces (as stored).
   * @returns {SearchIndex} The index.
   */
  set (id, terms) {
    this.#unlink(id) // a record set again keeps its place
    const list = typeof terms === 'string' ? terms.split(/\s+/).filter(term => term !== '') : [...(terms ?? [])]
    this.#records.set(id, list)
    for (const term of list) {
      let ids = this.#postings.get(term)
      if (ids === undefined) {
        ids = new Set()
        this.#postings.set(term, ids)
        this.#sorted = null
      }
      ids.add(id)
    }
    return this
  }

  /**
   * Removes a record.
   * @param {string} id - The identifier of the record.
   * @returns {boolean} `true` if it was in the index.
   */
  delete (id) {
    if (!this.#records.has(id)) { return false }
    this.#unlink(id)
    this.#records.delete(id)
    return true
  }

  /** Removes all the records. */
  clear () {
    this.#records.clear()
    this.#postings.clear()
    this.#sorted = null
  }

  // the terms of a record forgotten (the record stays)
  #unlink (id) {
    for (const term of this.#records.get(id) ?? []) {
      const ids = this.#postings.get(term)
      ids?.delete(id)
      if (ids?.size === 0) {
        this.#postings.delete(term)
        this.#sorted = null
      }
    }
  }

  /**
   * The records that hold all the terms of a query, each one as the beginning of one of their terms.
   * @param {string} text - The query, as typed.
   * @returns {string[]} The identifiers, in the order the records were first put in the index; none for a query
   *   without any term.
   */
  query (text) {
    const terms = searchTerms(text, this.#options)
    if (terms.length === 0) { return [] }
    let found = null
    for (const term of terms) {
      const ids = this.#beginning(term)
      found = found === null ? ids : new Set([...found].filter(id => ids.has(id)))
      if (found.size === 0) { return [] }
    }
    return [...this.#records.keys()].filter(id => found.has(id))
  }

  // the records with a term that begins with this one
  #beginning (start) {
    if (this.#sorted === null) { this.#sorted = [...this.#postings.keys()].sort() }
    const sorted = this.#sorted
    let low = 0
    let high = sorted.length
    while (low < high) { // the first term not before `start`
      const middle = (low + high) >> 1
      if (sorted[middle] < start) { low = middle + 1 } else { high = middle }
    }
    const ids = new Set()
    for (let i = low; i < sorted.length && sorted[i].startsWith(start); i++) {
      for (const id of this.#postings.get(sorted[i])) { ids.add(id) }
    }
    return ids
  }
}
