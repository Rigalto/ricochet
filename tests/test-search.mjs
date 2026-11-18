// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-search.mjs — node tests/run.mjs Search
// The terms of a text and the search index (utils/search.mjs).

import {describe, assert} from './kernel.mjs'
import {searchTerms, SearchIndex, STOP_WORDS_FR, STOP_WORDS_EN} from '../src/utils/search.mjs'

describe('Search — the terms of a text', () => {
  const terms = searchTerms('Le compactage du sol, puis compacter les bords', {stopWords: STOP_WORDS_FR})
  assert('lowercase, no stop words, no short words, sorted', terms.join() === 'bords,compactage,compacter,sol')
  assert('without accents, cut on punctuation, apostrophes, hyphens', searchTerms("L'ÉTÉ : porte-fenêtre, œuvre !").join() === 'ete,fenetre,oeuvre,porte')
  assert('a word that begins another is dropped', searchTerms('compact compactage pompe pompes pomper').join() === 'compactage,pomper,pompes')
  assert('a word inside another is kept', searchTerms('pact compact').join() === 'compact,pact')
  assert('each term once', searchTerms('sol Sol SOL sols').join() === 'sols')
  assert('digits are words; letters of other scripts too', searchTerms('2026 42 λόγος').join() === '2026,λογος')
  assert('minLength', searchTerms('ia go 3d bus', {minLength: 2}).join() === '3d,bus,go,ia')
  assert('English stop words', searchTerms('The kitchen and the garden', {stopWords: STOP_WORDS_EN}).join() === 'garden,kitchen')
  assert('a Set of stop words', searchTerms('alpha beta', {stopWords: new Set(['beta'])}).join() === 'alpha')
  assert('no text: no terms', searchTerms('').length === 0 && searchTerms(null).length === 0)
  assert('the stop words are folded and unique', new Set(STOP_WORDS_FR).size === STOP_WORDS_FR.length && STOP_WORDS_FR.every(w => /^[a-z]+$/.test(w)))
})

describe('Search — the index', () => {
  const index = new SearchIndex({stopWords: STOP_WORDS_FR})
  index.set('a', searchTerms('Le compactage du sol', {stopWords: STOP_WORDS_FR}))
  index.set('b', 'arrosage pompes sol') // terms as stored: separated by spaces
  index.set('c', ['pompe', 'jardin'])
  assert('the number of records', index.size === 3)
  assert('a term as the beginning of a word', index.query('compact').join() === 'a' && index.query('pomp').join() === 'b,c')
  assert('all the terms of the query', index.query('sol pompe').join() === 'b' && index.query('sol jardin').length === 0)
  assert('the query folded, its stop words and short words ignored', index.query('Le SOL du').join() === 'a,b')
  assert('a query without terms finds nothing', index.query('le du').length === 0 && index.query('').length === 0)
  assert('a plural does not find the singular', index.query('pompes').join() === 'b')
  index.set('a', 'jardin potager')
  assert('set again: the terms replaced', index.query('compact').length === 0 && index.query('jardin').join() === 'a,c')
  assert('delete', index.delete('c') && !index.delete('c') && index.query('jardin').join() === 'a' && index.size === 2)
  index.clear()
  assert('clear', index.size === 0 && index.query('sol').length === 0)
})
