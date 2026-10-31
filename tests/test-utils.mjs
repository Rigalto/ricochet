// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-utils.mjs — node tests/run.mjs Utils
// The utilities of ricochet-utils.mjs: dates, texts, numbers, random numbers, noise, complex numbers, hashes,
// collections, identifiers, debounce and throttle.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import * as utils from '../src/ricochet-utils.mjs'
import {
  today, isValidDate, parseDate, formatDate, toIsoDate, fromDate, toDate, compareDates, addDays, addMonths, addYears,
  differenceInDays, dateDifference, dayOfWeek, startOfWeek, startOfMonth, isLeapYear, getDaysInMonth, splitDuration,
  formatDuration, convertDate,
  deburr, foldCase, upperFirst, truncateMiddle, countWords, indexesOf, urlHost, formatNumber,
  clamp, isBetween, approxEqual, lerp, inverseLerp, mapLinear, damp, smoothstep, smootherstep, cosineInterpolate,
  sigmoid, degToRad, radToDeg, euclideanModulo, roundTo, splitNumber, isPowerOfTwo, isNumber, toNumber,
  Random, random, entropy, PerlinNoise, ValueNoise, Complex, djb2, djb2String, sha256,
  clearObject, removeWhere, removeUnordered, firstOf, IdGenerator, createIdGenerator, uniqueId,
  debounce, throttle, promiseState
} from '../src/ricochet-utils.mjs'
import {escapeHtml, unescapeHtml} from '../src/utils/dom.mjs'
import {ConfigStore} from '../src/core/config.mjs'
import {MemoryAdapter} from '../src/adapters/memory.mjs'
import {Microtasker} from '../src/core/microtasker.mjs'
import {Scheduler} from '../src/core/scheduler.mjs'
import {bus} from '../src/core/bus.mjs'

if (globalThis.crypto?.subtle === undefined) { // Node 18
  globalThis.crypto = (await import('node:crypto')).webcrypto
}

const spaces = text => text.replace(/\s/g, ' ') // Intl writes no-break spaces
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

describe('Utils — entry point', () => {
  assert('67 exports', Object.keys(utils).length === 67)
  assert('every export is defined', Object.values(utils).every(v => v !== undefined))
})

// ---------------------------------------------------------------------------------------------- date

describe('Utils — date: validity and calendar', () => {
  assert('leap years', isLeapYear(2024) && isLeapYear(2000) && !isLeapYear(1900) && !isLeapYear(2026))
  assert('days in February', getDaysInMonth(2024, 2) === 29 && getDaysInMonth(2026, 2) === 28)
  assert('days in April and in December', getDaysInMonth(2026, 4) === 30 && getDaysInMonth(2026, 12) === 31)
  assert('valid dates', isValidDate('2024-02-29') && isValidDate('0001-01-01') && isValidDate('9999-12-31'))
  assert('invalid dates', !isValidDate('2025-02-29') && !isValidDate('2026-13-01') && !isValidDate('2026-00-10') &&
    !isValidDate('2026-1-5') && !isValidDate('') && !isValidDate(null) && !isValidDate('20/10/2026'))
  assert('toIsoDate pads', toIsoDate(987, 3, 7) === '0987-03-07')
  assert('today is valid', isValidDate(today()))
  assert('fromDate is local', fromDate(new Date(2026, 9, 20, 23, 59)) === '2026-10-20')
  const d = toDate('2026-10-20')
  assert('toDate at local midnight', d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 20 && d.getHours() === 0)
  assert('toDate for a year below 100', toDate('0050-06-01').getFullYear() === 50)
  assert('compareDates', compareDates('2026-01-02', '2026-01-10') === -1 && compareDates('2026-01-10', '2026-01-02') === 1 &&
    compareDates('2026-01-02', '2026-01-02') === 0)
  assert('sort() works on ISO dates', same(['2026-10-01', '2025-12-31', '2026-02-15'].sort(), ['2025-12-31', '2026-02-15', '2026-10-01']))
})

describe('Utils — date: arithmetic', () => {
  assert('addDays over a year', addDays('2026-12-31', 1) === '2027-01-01')
  assert('addDays back over March', addDays('2024-03-01', -1) === '2024-02-29')
  assert('addDays over the summer time change', addDays('2026-03-28', 2) === '2026-03-30')
  assert('addMonths clamps the day', addMonths('2026-01-31', 1) === '2026-02-28' && addMonths('2024-01-31', 1) === '2024-02-29')
  assert('addMonths over a year', addMonths('2026-11-15', 3) === '2027-02-15' && addMonths('2026-02-15', -3) === '2025-11-15')
  assert('addYears from a 29 February', addYears('2024-02-29', 1) === '2025-02-28' && addYears('2024-02-29', 4) === '2028-02-29')
  assert('differenceInDays', differenceInDays('2026-01-01', '2027-01-01') === 365 && differenceInDays('2024-03-01', '2024-02-28') === -2)
  assert('dateDifference: an age', same(dateDifference('1990-05-14', '2026-10-20'), {years: 36, months: 5, days: 6}))
  assert('dateDifference: the day before a birthday', same(dateDifference('1990-10-21', '2026-10-20'), {years: 35, months: 11, days: 29}))
  assert('dateDifference: from the 31st (as Temporal)', same(dateDifference('2026-01-31', '2026-03-01'), {years: 0, months: 1, days: 1}))
  assert('dateDifference: same day', same(dateDifference('2026-10-20', '2026-10-20'), {years: 0, months: 0, days: 0}))
  assert('dateDifference: backwards is negative', same(dateDifference('2026-10-20', '1990-05-14'), {years: -36, months: -5, days: -6}))
  assert('dayOfWeek: Tuesday', dayOfWeek('2026-10-20') === 2)
  assert('dayOfWeek: Sunday before 1970', dayOfWeek('1969-12-28') === 7)
  assert('startOfWeek is the Monday', startOfWeek('2026-10-25') === '2026-10-19' && startOfWeek('2026-10-19') === '2026-10-19')
  assert('startOfWeek over a month', startOfWeek('2026-11-01') === '2026-10-26')
  assert('startOfMonth', startOfMonth('2026-10-20') === '2026-10-01')
})

describe('Utils — date: patterns', () => {
  assert('parseDate dd/MM/yyyy', parseDate('20/10/2026', 'dd/MM/yyyy') === '2026-10-20')
  assert('parseDate d/M/yyyy', parseDate('3/2/2025', 'd/M/yyyy') === '2025-02-03')
  assert('parseDate yyyyMMdd', parseDate('20261020', 'yyyyMMdd') === '2026-10-20')
  assert('parseDate ISO by default, spaces trimmed', parseDate(' 2026-10-20 ') === '2026-10-20')
  assert('parseDate: date that does not exist', parseDate('29/02/2025', 'dd/MM/yyyy') === null)
  assert('parseDate: wrong text', parseDate('20-10-2026', 'dd/MM/yyyy') === null && parseDate('', 'dd/MM/yyyy') === null)
  assert('parseDate: dot is literal', parseDate('20.10.2026', 'dd.MM.yyyy') === '2026-10-20' && parseDate('20x10x2026', 'dd.MM.yyyy') === null)
  assert('parseDate: pattern without a year', parseDate('20/10', 'dd/MM') === null)
  assert('formatDate dd/MM/yyyy', formatDate('2026-03-07', 'dd/MM/yyyy') === '07/03/2026')
  assert('formatDate d/M/yyyy', formatDate('2026-03-07', 'd/M/yyyy') === '7/3/2026')
  assert('formatDate yyyyMMdd', formatDate('2026-03-07', 'yyyyMMdd') === '20260307')
  assert('formatDate: names in French', formatDate('2026-10-20', 'EEEE d MMMM yyyy', 'fr') === 'mardi 20 octobre 2026')
  assert('formatDate: names in English', formatDate('2026-10-20', 'EEE, MMM d', 'en') === 'Tue, Oct 20')
  assert('formatDate: text between apostrophes', formatDate('2026-10-20', "d 'de' MMMM", 'es') === '20 de octubre')
  assert('formatDate: Intl options', spaces(formatDate('2026-10-20', {dateStyle: 'long'}, 'fr')) === '20 octobre 2026')
  assert('formatDate: Intl never shifts the day', formatDate('2026-01-01', {day: 'numeric'}, 'en') === '1')
  assert('formatDate: invalid date', formatDate('2026-02-30', 'dd/MM/yyyy') === '')
  assert('parseDate and formatDate are inverse', parseDate(formatDate('2024-02-29', 'dd/MM/yyyy'), 'dd/MM/yyyy') === '2024-02-29')
  assert('convertDate dd/MM/yyyy → yyyyMMdd', convertDate('20/10/2026', 'dd/MM/yyyy', 'yyyyMMdd') === '20261020')
  assert('convertDate ISO → dd/MM/yyyy', convertDate('2026-03-07', 'yyyy-MM-dd', 'dd/MM/yyyy') === '07/03/2026')
  assert('convertDate yyyyMMdd → ISO by default', convertDate('20261020', 'yyyyMMdd') === '2026-10-20')
  assert('convertDate: no such date, empty, absent', convertDate('31/02/2026', 'dd/MM/yyyy') === '' && convertDate('', 'dd/MM/yyyy') === '' && convertDate(undefined) === '')
  assert('convertDate: MySQL empty date', convertDate('0000-00-00', 'yyyy-MM-dd', 'dd/MM/yyyy') === '')
})

describe('Utils — date: durations', () => {
  assert('splitDuration', same(splitDuration(90061001), {days: 1, hours: 1, minutes: 1, seconds: 1, milliseconds: 1}))
  assert('splitDuration of 0', same(splitDuration(0), {days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0}))
  assert('formatDuration in French', spaces(formatDuration(2 * 86400000 + 3 * 3600000 + 5000, {locale: 'fr'})) === '2 jours, 3 heures et 5 secondes')
  assert('formatDuration in English', formatDuration(90061000, {locale: 'en'}) === '1 day, 1 hour, 1 minute, and 1 second')
  assert('formatDuration short', spaces(formatDuration(3 * 3600000 + 60000, {locale: 'fr', style: 'short'})) === '3 h 1 min')
  assert('formatDuration below a second', formatDuration(400, {locale: 'en'}) === '0 seconds')
})

// ---------------------------------------------------------------------------------------------- string and dom

describe('Utils — string', () => {
  assert('deburr accents', deburr('Ça coûte à Noël, déjà') === 'Ca coute a Noel, deja')
  assert('deburr ligatures and special letters', deburr('Œuvre, cœur, Æsir, straße, Øresund, Łódź') === 'Oeuvre, coeur, Aesir, strasse, Oresund, Lodz')
  assert('deburr keeps other scripts', deburr('東京 Москва') === '東京 Москва')
  assert('foldCase', foldCase('Élève ÉCOLE') === 'eleve ecole')
  assert('foldCase makes texts comparable', foldCase('NOËL') === foldCase('noel'))
  assert('upperFirst', upperFirst('élan vital') === 'Élan vital' && upperFirst('iPhone') === 'IPhone' && upperFirst('') === '')
  assert('upperFirst keeps the rest', upperFirst('hELLO') === 'HELLO')
  assert('truncateMiddle short text unchanged', truncateMiddle('abc', 5) === 'abc')
  const t = truncateMiddle('/home/didier/projects/ricochet/src/index.mjs', 20)
  assert('truncateMiddle length', t.length === 20 && t.startsWith('/home/did') && t.endsWith('index.mjs') && t.includes('…'))
  assert('countWords in French', countWords("L'arbre, qui pousse — vite !", 'fr') === 4)
  assert('countWords of an empty text', countWords('') === 0)
  assert('countWords counts numbers', countWords('il y a 3 chats', 'fr') === 5)
  assert('indexesOf', same(indexesOf('banana', 'a'), [1, 3, 5]) && same(indexesOf('banana', 'ana'), [1, 3]) && same(indexesOf('abc', 'z'), []))
  assert('indexesOf empty search', same(indexesOf('abc', ''), []))
  assert('urlHost with protocol', urlHost('https://www.example.com/a/b?c=1') === 'www.example.com')
  assert('urlHost without protocol, with port', urlHost('example.org:8080/path') === 'example.org')
  assert('urlHost empty', urlHost('') === '' && urlHost(undefined) === '')
  assert('formatNumber in French', formatNumber(1234567.5, {locale: 'fr-FR'}) === '1\u202f234\u202f567,5')
  assert('formatNumber in English', formatNumber(1234567.5, {locale: 'en'}) === '1,234,567.5')
  assert('formatNumber decimals', formatNumber(0.0001234, {locale: 'fr-FR', decimals: 6}) === '0,000123' && formatNumber(2, {locale: 'fr-FR', decimals: 2}) === '2,00')
  assert('formatNumber no separator inside the decimals', formatNumber(1.234567, {locale: 'fr-FR', decimals: 6}) === '1,234567')
  assert('formatNumber at most 3 decimals by default', formatNumber(3.14159, {locale: 'fr-FR'}) === '3,142')
  assert('formatNumber of a string', formatNumber('-1234', {locale: 'fr-FR'}) === '-1\u202f234')
  assert('formatNumber: not a number', formatNumber('abc') === '' && formatNumber('') === '' && formatNumber(NaN) === '' && formatNumber(Infinity) === '')
  assert('unescapeHtml', unescapeHtml('&lt;b&gt; &amp; &quot;x&quot; &#39;y&#x27; &apos;z&apos;') === '<b> & "x" \'y\' \'z\'')
  assert('unescapeHtml keeps unknown entities', unescapeHtml('&copy; &bogus;') === '&copy; &bogus;')
  assert('unescapeHtml inverts escapeHtml', unescapeHtml(escapeHtml('<a href="x">T&C</a>')) === '<a href="x">T&C</a>')
})

// ---------------------------------------------------------------------------------------------- math

describe('Utils — math', () => {
  assert('clamp', clamp(5, 0, 3) === 3 && clamp(-1, 0, 3) === 0 && clamp(2, 0, 3) === 2)
  assert('isBetween includes both bounds', isBetween(0, 0, 3) && isBetween(3, 0, 3) && !isBetween(3.1, 0, 3))
  assert('approxEqual', approxEqual(0.1 + 0.2, 0.3) && !approxEqual(1, 1.01) && approxEqual(1e9, 1e9 + 1))
  assert('approxEqual with epsilon', approxEqual(1, 1.01, 0.1))
  assert('lerp', lerp(10, 20, 0) === 10 && lerp(10, 20, 1) === 20 && lerp(10, 20, 0.25) === 12.5)
  assert('inverseLerp', inverseLerp(10, 20, 12.5) === 0.25 && inverseLerp(5, 5, 7) === 0)
  assert('mapLinear', mapLinear(5, 0, 10, 100, 200) === 150 && mapLinear(-5, 0, 10, 0, 1) === -0.5)
  assert('damp goes towards the target', damp(0, 10, 5, 0) === 0 && damp(0, 10, 5, 0.1) > 0 && damp(0, 10, 5, 0.1) < 10)
  const once = damp(0, 10, 5, 0.2)
  const twice = damp(damp(0, 10, 5, 0.1), 10, 5, 0.1)
  assert('damp does not depend on the frame rate', approxEqual(once, twice))
  assert('smoothstep', smoothstep(0, 0, 1) === 0 && smoothstep(1, 0, 1) === 1 && smoothstep(0.5, 0, 1) === 0.5 && smoothstep(15, 10, 20) === 0.5)
  assert('smoothstep outside', smoothstep(-1, 0, 1) === 0 && smoothstep(2, 0, 1) === 1)
  assert('smootherstep', smootherstep(0.5, 0, 1) === 0.5 && smootherstep(0.25, 0, 1) < smoothstep(0.25, 0, 1))
  assert('cosineInterpolate', cosineInterpolate(0, 10, 0) === 0 && approxEqual(cosineInterpolate(0, 10, 1), 10) && approxEqual(cosineInterpolate(0, 10, 0.5), 5))
  assert('sigmoid', sigmoid(0) === 0.5 && sigmoid(10) > 0.99 && sigmoid(-10) < 0.01)
  assert('degToRad and radToDeg', degToRad(180) === Math.PI && radToDeg(Math.PI / 2) === 90)
  assert('euclideanModulo', euclideanModulo(-1, 5) === 4 && euclideanModulo(7, 5) === 2 && euclideanModulo(-370, 360) === 350)
  assert('roundTo', roundTo(3.14159, 2) === 3.14 && roundTo(2.5) === 3 && roundTo(1234, -2) === 1200)
  assert('splitNumber', same(splitNumber(3.25), {int: 3, fract: 0.25}) && same(splitNumber(-1.25), {int: -2, fract: 0.75}))
  assert('isPowerOfTwo', isPowerOfTwo(1) && isPowerOfTwo(1024) && !isPowerOfTwo(0) && !isPowerOfTwo(6))
  assert('isNumber', isNumber(3) && isNumber('3.5') && isNumber(' -2 ') && !isNumber('') && !isNumber('3a') &&
    !isNumber(NaN) && !isNumber(Infinity) && !isNumber(null))
  assert('toNumber', toNumber('3.5') === 3.5 && toNumber('x') === 0 && toNumber(undefined, -1) === -1)
})

// ---------------------------------------------------------------------------------------------- random

describe('Utils — random: sequences', () => {
  const a = new Random(1234)
  const b = new Random(1234)
  const sa = Array.from({length: 5}, () => a.next())
  const sb = Array.from({length: 5}, () => b.next())
  assert('same seed, same sequence', same(sa, sb))
  assert('numbers from 0 to 1', sa.every(n => n >= 0 && n < 1))
  assert('another seed, another sequence', new Random(1235).next() !== new Random(1234).next())
  assert('string seeds', new Random('world-12').next() === new Random('world-12').next() && new Random('a').next() !== new Random('b').next())
  const r = new Random(7)
  r.next()
  const state = r.getState()
  const next = [r.next(), r.next()]
  r.setState(state)
  assert('getState and setState replay', same([r.next(), r.next()], next))
  r.seed(7)
  assert('seed() starts again', r.next() === new Random(7).next())
  assert('the generator of the application', random instanceof Random)
  // a rough check of the distribution
  const g = new Random(42)
  const bins = new Array(10).fill(0)
  for (let i = 0; i < 100000; i++) { bins[Math.floor(g.next() * 10)]++ }
  assert('uniform distribution (each tenth within 3 %)', bins.every(n => Math.abs(n - 10000) < 300))
})

describe('Utils — random: draws', () => {
  const r = new Random(99)
  const ints = Array.from({length: 2000}, () => r.int(3, 8))
  assert('int: bounds included', Math.min(...ints) === 3 && Math.max(...ints) === 8 && ints.every(Number.isInteger))
  const maxOnly = Array.from({length: 500}, () => r.int(2))
  assert('int(max) from 0', Math.min(...maxOnly) === 0 && Math.max(...maxOnly) === 2)
  const range = Array.from({length: 500}, () => r.int({min: -2, max: 2}))
  assert('int({min, max})', Math.min(...range) === -2 && Math.max(...range) === 2)
  const floats = Array.from({length: 2000}, () => r.float(1, 2))
  assert('float: from min to max', floats.every(f => f >= 1 && f < 2))
  assert('float() from 0 to 1, float(max), float({min, max})', r.float() < 1 && r.float(5) < 5 && r.float({min: 10, max: 11}) >= 10)
  const trues = Array.from({length: 10000}, () => r.bool(0.2)).filter(Boolean).length
  assert('bool(0.2)', trues > 1800 && trues < 2200)
  assert('bool(0) and bool(1)', !r.bool(0) && r.bool(1))
  assert('pick and index', ['a', 'b', 'c'].includes(r.pick(['a', 'b', 'c'])) && r.index([1, 2]) < 2)
  assert('pick and index of an empty array', r.pick([]) === undefined && r.index([]) === undefined)
  const items = [{name: 'gold', weight: 10}, {name: 'none', weight: 0}, {name: 'gem', weight: 1}, {name: 'coin'}]
  const counts = {gold: 0, none: 0, gem: 0, coin: 0}
  for (let i = 0; i < 12000; i++) { counts[r.weightedPick(items).name]++ }
  assert('weightedPick follows the weights', counts.none === 0 && counts.gold > 9000 && counts.gem > 700 && counts.coin > 700)
  const decimals = [{weight: 0.2}, {weight: 0.8}]
  let first = 0
  for (let i = 0; i < 10000; i++) { if (r.weightedIndex(decimals) === 0) { first++ } }
  assert('weightedIndex with decimal weights', first > 1800 && first < 2200)
  assert('weightedIndex with a weight function', r.weightedIndex([5, 0, 0], w => w) === 0)
  assert('weightedIndex without positive weight', r.weightedIndex([{weight: 0}]) === undefined && r.weightedPick([]) === undefined)
  const array = [1, 2, 3, 4, 5, 6]
  const shuffled = r.shuffle(array)
  assert('shuffle in place', shuffled === array && same([...array].sort(), [1, 2, 3, 4, 5, 6]))
  const gauss = Array.from({length: 20000}, () => r.gaussian(10, 2))
  const mean = gauss.reduce((s, v) => s + v, 0) / gauss.length
  const sd = Math.sqrt(gauss.reduce((s, v) => s + (v - mean) ** 2, 0) / gauss.length)
  assert('gaussian: mean and deviation', Math.abs(mean - 10) < 0.1 && Math.abs(sd - 2) < 0.1)
  const lin = Array.from({length: 20000}, () => r.linear())
  assert('linear: mean 2/3', Math.abs(lin.reduce((s, v) => s + v, 0) / lin.length - 2 / 3) < 0.01)
})

describe('Utils — random: entropy', () => {
  assert('two equal choices: 1 bit', entropy([{}, {}]) === 1)
  assert('eight equal choices: 3 bits', approxEqual(entropy(new Array(8).fill({weight: 2})), 3))
  assert('a single choice: 0', entropy([{weight: 5}]) === 0)
  assert('a weight of 0 does not count', entropy([{weight: 1}, {weight: 0}]) === 0)
})

// ---------------------------------------------------------------------------------------------- noise

describe('Utils — noise', () => {
  const p1 = new PerlinNoise(new Random('noise'))
  const p2 = new PerlinNoise(new Random('noise'))
  const values = Array.from({length: 1000}, (_, i) => p1.get(i * 0.037, i * 0.011))
  assert('Perlin: from 0 to 1', values.every(v => v >= 0 && v <= 1))
  assert('Perlin: varies', Math.max(...values) - Math.min(...values) > 0.3)
  assert('Perlin: same generator, same noise', p1.get(3.3, 1.7, 0.5) === p2.get(3.3, 1.7, 0.5))
  assert('Perlin: smooth', Math.abs(p1.get(5) - p1.get(5.001)) < 0.01)
  assert('Perlin: another seed, another noise', new PerlinNoise(new Random('other')).get(3.3, 1.7) !== p1.get(3.3, 1.7))
  p1.setOctaves([{scale: 1, amplitude: 1}])
  assert('Perlin: 0.5 at integer coordinates with one octave', p1.get(4, 7, 2) === 0.5)
  const v1 = new ValueNoise(new Random('noise'))
  const v2 = new ValueNoise(new Random('noise'))
  const vs = Array.from({length: 1000}, (_, i) => v1.get(i * 0.05, i * 0.02))
  assert('Value: from 0 to 0.9375', vs.every(v => v >= 0 && v <= 0.9375))
  assert('Value: same generator, same noise', v1.get(1.5, 2.5, 3.5) === v2.get(1.5, 2.5, 3.5))
  assert('Value: negative coordinates as positive', v1.get(-1.25, 2) === v1.get(1.25, 2))
  assert('Value: smooth', Math.abs(v1.get(8) - v1.get(8.001)) < 0.01)
  v1.detail(1)
  assert('Value: detail(1), one octave, at most 0.5', Array.from({length: 200}, (_, i) => v1.get(i * 0.1)).every(v => v <= 0.5))
  v2.reseed()
  assert('Value: reseed draws another noise', v2.get(1.5, 2.5, 3.5) !== new ValueNoise(new Random('noise')).get(1.5, 2.5, 3.5))
})

// ---------------------------------------------------------------------------------------------- complex

describe('Utils — complex', () => {
  const s = z => z.toString()
  assert('constructor', s(new Complex(3, -2)) === '3-2i' && s(new Complex()) === '0')
  assert('from strings', s(Complex.from('4.2 + 2.5 i')) === '4.2+2.5i' && s(Complex.from('-2.5i')) === '-2.5i' &&
    s(Complex.from('i')) === 'i' && s(Complex.from('-i')) === '-i' && s(Complex.from('7')) === '7' && s(Complex.from('1e3+4i')) === '1000+4i')
  assert('from a wrong string: NaN', s(Complex.from('3+')) === 'NaN' && Number.isNaN(Complex.from('x').r))
  assert('from an array, {r, i}, {x, y}', s(Complex.from([3, 4])) === '3+4i' && s(Complex.from({r: 1, i: 2})) === '1+2i' && s(Complex.from({x: 5, y: -1})) === '5-i')
  assert('from polar forms', Complex.from({mod: 2, arg: Math.PI / 2}).equals('2i') && Complex.from({mod: 2, deg: 90}).equals([0, 2]))
  assert('from two numbers', s(Complex.from(3, -2)) === '3-2i')
  const z = new Complex(3, 4)
  assert('a Complex is returned as it is', Complex.from(z) === z)
  assert('mod and arg', z.mod === 5 && approxEqual(new Complex(0, 1).arg, Math.PI / 2))
  assert('add, sub', s(z.add(1, 1)) === '4+5i' && s(z.sub('3+4i')) === '0')
  assert('mul', s(z.mul('i')) === '-4+3i' && s(new Complex(1, 2).mul(3, 4)) === '-5+10i')
  assert('div', z.div(z).equals(1) && new Complex(-5, 10).div(3, 4).equals('1+2i'))
  assert('division by zero: NaN', Number.isNaN(z.div(0).r) && Number.isNaN(new Complex().inverse().i))
  assert('negate, scale, conjugate', s(z.negate()) === '-3-4i' && s(z.scale(2)) === '6+8i' && s(z.conjugate()) === '3-4i')
  assert('inverse', z.inverse().mul(z).equals(1))
  assert('exp: Euler', new Complex(0, Math.PI).exp().equals(-1))
  assert('exp of a real', new Complex(1, 0).exp().equals(Math.E))
  assert('ln inverts exp', new Complex(1, 1).exp().ln().equals('1+i') && new Complex(-1).ln().equals([0, Math.PI]))
  assert('pow and sqrt', new Complex(-4).sqrt().equals('2i') && z.pow(2).equals(z.mul(z)) && z.pow(0.5).equals(z.sqrt()))
  assert('equals with epsilon', z.equals('3.001+4i', 1e-2) && !z.equals('3.001+4i'))
  assert('floor, ceil, round, roundTo', s(new Complex(1.5, -1.5).floor()) === '1-2i' && s(new Complex(1.5, -1.5).ceil()) === '2-i' &&
    s(new Complex(1.4, -1.6).round()) === '1-2i' && s(new Complex(1.2345, 2.3456).roundTo(2)) === '1.23+2.35i')
  assert('roundTo gives numbers', typeof new Complex(1.2345, 0).roundTo(1).r === 'number')
  assert('toString digits, no -0', new Complex(Math.PI, -0).toString(2) === '3.14' && new Complex(-0, 1).toString() === 'i')
  assert('toArray, toJSON', same(z.toArray(), [3, 4]) && JSON.stringify(z) === '{"r":3,"i":4}')
  const view = new DataView(new ArrayBuffer(8))
  assert('toDataView', z.toDataView(view, 0) === 8 && view.getFloat32(0, true) === 3 && view.getFloat32(4, true) === 4)
  assert('toString read again by from', Complex.from(new Complex(-1.5, 0.25).toString()).equals([-1.5, 0.25]))
  // the Mandelbrot example of the documentation
  let m = new Complex()
  const c = Complex.from('-0.75+0.1i')
  let n = 0
  for (; n < 100 && m.mod <= 2; n++) { m = m.mul(m).add(c) }
  assert('the example of the documentation runs', n > 10 && n <= 100)
})

// ---------------------------------------------------------------------------------------------- hash

await describe('Utils — hash', async () => {
  assert('djb2 of an empty text', djb2('') === 5381)
  assert('djb2 is stable and unsigned', djb2('hello') === djb2('hello') && djb2('hello') >= 0 && djb2('hello') < 2 ** 32)
  assert('djb2 known value', djb2('a') === ((5381 * 33) ^ 97) >>> 0)
  assert('djb2 differs', djb2('hello') !== djb2('hellp'))
  assert('djb2String', /^[0-9a-z]+$/.test(djb2String('hello world')) && djb2String('ab') !== djb2String('ba'))
  assert('sha256 of a text', await sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert('sha256 of bytes', await sha256(new Uint8Array([97, 98, 99])) === await sha256('abc'))
  assert('sha256 of UTF-8', (await sha256('é')).length === 64 && await sha256('é') !== await sha256('e'))
})

// ---------------------------------------------------------------------------------------------- collection

await describe('Utils — collection', async () => {
  const o = {a: 1, b: 2}
  const held = o
  assert('clearObject in place', clearObject(o) === held && Object.keys(held).length === 0)
  const array = [1, 2, 3, 4, 5, 6, 7]
  assert('removeWhere count', removeWhere(array, n => n % 2 === 0) === 3)
  assert('removeWhere keeps the others', same([...array].sort(), [1, 3, 5, 7]))
  const all = [1, 2]
  assert('removeWhere everything', removeWhere(all, () => true) === 2 && all.length === 0)
  const flagged = [{deleted: true}, {deleted: false}, {deleted: true}]
  removeWhere(flagged, item => item.deleted)
  assert('removeWhere on records', flagged.length === 1 && !flagged[0].deleted)
  const list = ['a', 'b', 'c', 'd']
  assert('removeUnordered', removeUnordered(list, 'b') && same(list, ['a', 'd', 'c']))
  assert('removeUnordered the last one', removeUnordered(list, 'c') && same(list, ['a', 'd']))
  assert('removeUnordered not found', !removeUnordered(list, 'z') && list.length === 2)
  assert('firstOf a set, a map, an array', firstOf(new Set(['x', 'y'])) === 'x' && same(firstOf(new Map([[1, 'a']])), [1, 'a']) && firstOf([7]) === 7)
  assert('firstOf empty', firstOf(new Set()) === undefined && firstOf(null) === undefined)
  assert('promiseState', await promiseState(new Promise(() => {})) === 'pending' &&
    await promiseState(Promise.resolve(1)) === 'fulfilled' && await promiseState(Promise.reject(new Error('x'))) === 'rejected')
})

// ---------------------------------------------------------------------------------------------- id

await describe('Utils — id', async () => {
  const session = new IdGenerator()
  const ids = Array.from({length: 28}, () => session.next())
  assert('session ids', ids[0] === 'aa' && ids[1] === 'ab' && ids[25] === 'az' && ids[26] === 'ba' && ids[27] === 'bb')
  assert('all different', new Set(ids).size === 28)
  const many = new IdGenerator()
  let last
  for (let i = 0; i < 26 * 27; i++) { last = many.next() }
  assert('seed in base 26 over z', last === 'aaz')
  assert('prefix', new IdGenerator({prefix: 'note-'}).next() === 'note-aa')
  assert('uniqueId', typeof uniqueId() === 'string' && uniqueId() !== uniqueId())

  const store = new ConfigStore({name: 'testId', saveDelay: 10})
  store.setAdapter(new MemoryAdapter({'app-id-seed': 'bz'}))
  await store.load()
  const g = createIdGenerator({item: 'app-id-seed', store})
  assert('persisted: the seed after the saved one', g.next() === 'caa' && g.next() === 'cab')
  assert('the seed is written', store.get('app-id-seed') === 'ca')
  const g2 = createIdGenerator({item: 'app-id-seed', store}) // the page loaded again
  assert('a new session takes the next seed', g2.next() === 'cba' && store.get('app-id-seed') === 'cb')

  const fresh = new ConfigStore({name: 'testId2', saveDelay: 10})
  fresh.setAdapter(new MemoryAdapter({}))
  await fresh.load()
  const f = createIdGenerator({item: 'app-seed', store: fresh})
  const fIds = Array.from({length: 27}, () => f.next())
  assert('new item: starts at aa', fIds[0] === 'aa' && fIds[26] === 'ba' && fresh.get('app-seed') === 'b')

  const bad = new ConfigStore({name: 'testId3', saveDelay: 10})
  bad.setAdapter(new MemoryAdapter({'app-seed': 'A1'}))
  await bad.load()
  captureConsole()
  const b = createIdGenerator({item: 'app-seed', store: bad}).next()
  const lines = releaseConsole()
  assert('a wrong seed starts again, reported', b === 'aa' && lines.some(l => l.includes('not a seed')))

  const unloaded = new ConfigStore({name: 'testId4'})
  captureConsole()
  const u = createIdGenerator({item: 'app-seed', store: unloaded}).next()
  const lines2 = releaseConsole()
  assert('items not loaded: reported, ids for the session', u === 'aa' && lines2.some(l => l.includes('not loaded')))
})

// ---------------------------------------------------------------------------------------------- timing

// a kernel with a fake time: advance(ms) moves the clock, releases the due tasks and runs the microtasks
const fakeKernel = () => {
  const time = {now: 0}
  const clocks = {real: {get time () { return time.now }}, game: {get time () { return time.now }}}
  const microtasker = new Microtasker({now: () => 0})
  const scheduler = new Scheduler({clocks, microtasker})
  const got = []
  const listener = payload => got.push([time.now, payload])
  bus.on('utilsTimingTest', listener)
  const flush = () => { while (microtasker.size > 0) { microtasker.run(1000, true) } }
  return {
    options: {scheduler, microtasker, clocks},
    got,
    flush,
    advance (ms) {
      const end = time.now + ms
      while (time.now < end) {
        time.now++
        scheduler.update(true)
        flush()
      }
    },
    stop () { bus.off('utilsTimingTest', listener) }
  }
}

describe('Utils — timing: debounce', () => {
  const k = fakeKernel()
  const save = debounce('utilsTimingTest', 100, k.options)
  save(1)
  k.advance(50)
  save(2)
  k.advance(50)
  save(3)
  assert('pending while the calls go on', save.pending && k.got.length === 0)
  k.advance(99)
  assert('nothing before the quiet time', k.got.length === 0)
  k.advance(1)
  assert('one event, with the last payload, after the quiet time', k.got.length === 1 && k.got[0][1] === 3 && k.got[0][0] === 200)
  assert('no longer pending', !save.pending)
  save(4)
  save.cancel()
  k.advance(200)
  assert('cancel', k.got.length === 1)
  save(5)
  save.flush()
  k.flush()
  assert('flush emits at once', k.got.length === 2 && k.got[1][1] === 5 && !save.pending)
  k.advance(200)
  assert('flush: not emitted twice', k.got.length === 2)
  save.flush()
  k.flush()
  assert('flush with nothing waiting', k.got.length === 2)
  const owner = {}
  const owned = debounce('utilsTimingTest', 50, {...k.options, owner})
  owned(6)
  k.options.scheduler.cancelOwner(owner)
  k.advance(100)
  assert('cancelled with its owner', k.got.length === 2)
  k.stop()
})

describe('Utils — timing: throttle', () => {
  const k = fakeKernel()
  const follow = throttle('utilsTimingTest', 100, k.options)
  follow('a')
  k.flush()
  assert('leading: at once', k.got.length === 1 && k.got[0][1] === 'a' && k.got[0][0] === 0)
  k.advance(30)
  follow('b')
  k.advance(30)
  follow('c')
  assert('within the period: waits', k.got.length === 1 && follow.pending)
  k.advance(40)
  assert('trailing: at the end of the period, last payload', k.got.length === 2 && k.got[1][1] === 'c' && k.got[1][0] === 100)
  k.advance(20)
  follow('d')
  assert('a call just after: waits for the next period', k.got.length === 2 && follow.pending)
  k.advance(80)
  assert('next period end', k.got.length === 3 && k.got[2][0] === 200 && k.got[2][1] === 'd')
  k.advance(150)
  follow('e')
  k.flush()
  assert('after a quiet period: leading again', k.got.length === 4 && k.got[3][1] === 'e' && k.got[3][0] === 350)
  // a steady stream: one event per period
  for (let i = 0; i < 50; i++) { follow(i); k.advance(10) }
  k.advance(100)
  const stream = k.got.slice(4)
  assert('steady stream: about one event per period', stream.length >= 5 && stream.length <= 6)
  assert('steady stream: the last payload arrives', stream[stream.length - 1][1] === 49)
  k.got.length = 0

  const lead = throttle('utilsTimingTest', 100, {...k.options, trailing: false})
  k.advance(500)
  lead(1)
  k.flush()
  lead(2)
  k.advance(200)
  assert('trailing: false', k.got.length === 1 && k.got[0][1] === 1)
  k.got.length = 0

  const trail = throttle('utilsTimingTest', 100, {...k.options, leading: false})
  trail(1)
  k.flush()
  assert('leading: false: not at once', k.got.length === 0)
  trail(2)
  k.advance(100)
  assert('leading: false: at the end, last payload', k.got.length === 1 && k.got[0][1] === 2)
  k.got.length = 0

  follow('x')
  k.flush()
  follow('y')
  follow.cancel()
  k.advance(200)
  assert('cancel', k.got.length === 1 && k.got[0][1] === 'x')
  follow('z')
  k.flush()
  assert('after cancel: a new period', k.got.length === 2 && k.got[1][1] === 'z')
  k.stop()
})
