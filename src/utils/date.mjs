// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Calendar dates, without hours and without time zones: a birthday, a due date, the day of a note.
 *
 * ## One format: ISO
 *
 * A date is a string `YYYY-MM-DD` (`'2026-10-20'`): the format of `<input type="date">`, of JSON, of SQL, and of
 * `Temporal.PlainDate` (the future date API of JavaScript, see below). Two dates in this format compare as strings,
 * and sort with `sort()`. Other formats are read with `parseDate()` and written with `formatDate()`, at the edges of
 * the application (a form, a table, an import).
 *
 * The functions never use the time zone: a date is the same day everywhere, and moving from summer to winter time
 * never shifts it.
 *
 * ## Patterns
 *
 * `parseDate()` and `formatDate()` use the letters of Unicode, as `date-fns` and `Intl` do: beware, `yyyy` is the
 * year and `dd` the day, while `YYYY` and `DD` mean something else there and are not accepted here.
 *
 * | Letters | Meaning | Example |
 * | --- | --- | --- |
 * | `yyyy` | year, 4 digits | 2026 |
 * | `MM`, `M` | month, 2 digits or as few as possible | 03, 3 |
 * | `dd`, `d` | day of the month | 07, 7 |
 * | `MMM`, `MMMM` | name of the month, short or long (`formatDate()` only) | oct., octobre |
 * | `EEE`, `EEEE` | name of the day, short or long (`formatDate()` only) | mar., mardi |
 *
 * Any other character is written as it is, and so is a text between apostrophes: `"d 'de' MMMM"`. For the formats of a language, give `formatDate()` the options of
 * `Intl.DateTimeFormat` instead of a pattern: `formatDate(date, {dateStyle: 'long'}, 'fr')` → `20 octobre 2026`.
 *
 * ## Functions
 *
 * | Function | Result |
 * | --- | --- |
 * | `today()` | the date of the computer |
 * | `isValidDate(date)` | `true` for an existing date in ISO format |
 * | `parseDate(text, pattern)`, `formatDate(date, pattern, locale)` | from and to other formats |
 * | `convertDate(text, from, to)` | from one format to another: `'20/10/2026'` → `'20261020'` |
 * | `toIsoDate(year, month, day)` | the ISO date of three numbers |
 * | `fromDate(date)`, `toDate(date)` | from and to a `Date` object (at midnight, local time) |
 * | `compareDates(a, b)` | -1, 0 or 1, for `sort()` |
 * | `addDays`, `addMonths`, `addYears` | a date moved; the 31st becomes the last day of a shorter month |
 * | `differenceInDays(from, to)` | the number of days between two dates |
 * | `dateDifference(from, to)` | `{years, months, days}` between two dates: the age of a person |
 * | `dayOfWeek(date)` | 1 for Monday to 7 for Sunday (ISO) |
 * | `startOfWeek(date)`, `startOfMonth(date)` | the Monday of the week, the first day of the month |
 * | `isLeapYear(year)`, `getDaysInMonth(year, month)` | the calendar |
 * | `splitDuration(ms)`, `formatDuration(ms, options)` | a duration in days, hours, minutes and seconds |
 *
 * ## Temporal
 *
 * The functions have the meaning of the `Temporal` API: `addMonths()` as `PlainDate.add({months})`,
 * `dateDifference()` as `until(…, {largestUnit: 'year'})`. When every browser has Temporal (Safari is the last one),
 * an application can use it with the same ISO strings, without changing its data.
 *
 * ```javascript
 * import {today, addMonths, formatDate, dateDifference} from 'ricochet/ricochet-utils.mjs'
 *
 * const due = addMonths(today(), 1)
 * formatDate(due, 'dd/MM/yyyy') // '20/11/2026'
 * dateDifference('1990-05-14', today()).years // 36
 * ```
 *
 * @module date
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const DAY = 86400000

const pad = (n, length) => String(n).padStart(length, '0')

// [year, month, day] of a valid ISO date
const partsOf = date => {
  const m = ISO.exec(date)
  console.assert(m !== null && isValidDate(date), `date: '${date}' is not a valid date (YYYY-MM-DD)`)
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

// days since 1970-01-01, without time zone
const dayNumber = date => {
  const [y, m, d] = partsOf(date)
  const t = new Date(0)
  t.setUTCFullYear(y, m - 1, d)
  return Math.round(t.getTime() / DAY)
}

const fromDayNumber = n => {
  const t = new Date(n * DAY)
  return toIsoDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}

// a Date at noon UTC, for Intl with timeZone 'UTC'
const utcDate = date => {
  const [y, m, d] = partsOf(date)
  const t = new Date(0)
  t.setUTCFullYear(y, m - 1, d)
  t.setUTCHours(12)
  return t
}

/**
 * Tells whether a year has a 29 February.
 * @param {number} year - The year.
 * @returns {boolean} `true` for a leap year.
 */
export const isLeapYear = year => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/**
 * The number of days of a month.
 * @param {number} year - The year.
 * @param {number} month - The month, from 1 to 12.
 * @returns {number} 28 to 31.
 */
export const getDaysInMonth = (year, month) =>
  month === 2 ? (isLeapYear(year) ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31

/**
 * Tells whether a string is an existing date, in ISO format.
 * @param {string} date - The string.
 * @returns {boolean} `true` for `'2024-02-29'`, `false` for `'2025-02-29'`, `'2025-2-3'` or `''`.
 */
export const isValidDate = date => {
  const m = typeof date === 'string' ? ISO.exec(date) : null
  if (m === null) { return false }
  const month = Number(m[2])
  const day = Number(m[3])
  return month >= 1 && month <= 12 && day >= 1 && day <= getDaysInMonth(Number(m[1]), month)
}

/**
 * The ISO date of three numbers.
 * @param {number} year - The year, from 0 to 9999.
 * @param {number} month - The month, from 1 to 12.
 * @param {number} day - The day of the month.
 * @returns {string} `YYYY-MM-DD`.
 */
export const toIsoDate = (year, month, day) => `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`

/**
 * The date of a `Date` object, in local time.
 * @param {Date} [date] - The moment; default: now.
 * @returns {string} The ISO date of that day, where the computer is.
 */
export const fromDate = (date = new Date()) => toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate())

/**
 * The date of today, where the computer is.
 * @returns {string} The ISO date.
 */
export const today = () => fromDate(new Date())

/**
 * A `Date` object for a date, at midnight, local time.
 * @param {string} date - ISO date.
 * @returns {Date} The moment the day starts, where the computer is.
 */
export const toDate = date => {
  const [y, m, d] = partsOf(date)
  const t = new Date(2000, 0, 1)
  t.setFullYear(y, m - 1, d)
  return t
}

/**
 * Compares two dates, for `sort()`.
 * @param {string} a - ISO date.
 * @param {string} b - ISO date.
 * @returns {number} -1 if `a` is before `b`, 1 if after, 0 if the same day.
 */
export const compareDates = (a, b) => a < b ? -1 : a > b ? 1 : 0

/**
 * Moves a date by a number of days.
 * @param {string} date - ISO date.
 * @param {number} days - Days to add; negative to go back.
 * @returns {string} The ISO date.
 */
export const addDays = (date, days) => fromDayNumber(dayNumber(date) + days)

/**
 * Moves a date by a number of months; a day that does not exist in the new month becomes its last day.
 * @param {string} date - ISO date.
 * @param {number} months - Months to add; negative to go back.
 * @returns {string} The ISO date: `addMonths('2026-01-31', 1)` is `'2026-02-28'`.
 */
export const addMonths = (date, months) => {
  const [y, m, d] = partsOf(date)
  const total = y * 12 + (m - 1) + months
  const year = Math.floor(total / 12)
  const month = total - year * 12 + 1
  return toIsoDate(year, month, Math.min(d, getDaysInMonth(year, month)))
}

/**
 * Moves a date by a number of years; a 29 February becomes a 28 February out of leap years.
 * @param {string} date - ISO date.
 * @param {number} years - Years to add; negative to go back.
 * @returns {string} The ISO date.
 */
export const addYears = (date, years) => addMonths(date, years * 12)

/**
 * The number of days from one date to another.
 * @param {string} from - ISO date.
 * @param {string} to - ISO date.
 * @returns {number} Positive if `to` is after `from`.
 */
export const differenceInDays = (from, to) => dayNumber(to) - dayNumber(from)

/**
 * The years, months and days from one date to another: whole years, then whole months, then days.
 * @param {string} from - ISO date (a date of birth).
 * @param {string} to - ISO date (today).
 * @returns {{years: number, months: number, days: number}} Each negative or zero if `to` is before `from`.
 */
export const dateDifference = (from, to) => {
  if (from > to) {
    const {years, months, days} = dateDifference(to, from)
    return {years: -years, months: -months, days: -days}
  }
  const [y1, m1] = partsOf(from)
  const [y2, m2] = partsOf(to)
  let total = (y2 - y1) * 12 + (m2 - m1)
  let step = addMonths(from, total)
  if (step > to) {
    total--
    step = addMonths(from, total)
  }
  return {years: Math.floor(total / 12), months: total % 12, days: differenceInDays(step, to)}
}

/**
 * The day of the week.
 * @param {string} date - ISO date.
 * @returns {number} 1 for Monday to 7 for Sunday.
 */
export const dayOfWeek = date => ((dayNumber(date) + 3) % 7 + 7) % 7 + 1 // 1970-01-01 was a Thursday

/**
 * The Monday of the week of a date.
 * @param {string} date - ISO date.
 * @returns {string} The ISO date of the Monday (the date itself on a Monday).
 */
export const startOfWeek = date => addDays(date, 1 - dayOfWeek(date))

/**
 * The first day of the month of a date.
 * @param {string} date - ISO date.
 * @returns {string} The ISO date of the 1st.
 */
export const startOfMonth = date => `${date.slice(0, 8)}01`

const PATTERN_TOKEN = /yyyy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|'[^']*'/g

/**
 * Reads a date written in another format.
 * @param {string} text - The text, `'20/10/2026'`.
 * @param {string} [pattern='yyyy-MM-dd'] - Its format, `'dd/MM/yyyy'` (see the module: `yyyy`, `MM`, `M`, `dd`, `d`).
 * @returns {string|null} The ISO date, or `null` if the text does not follow the pattern or the date does not exist.
 */
export const parseDate = (text, pattern = 'yyyy-MM-dd') => {
  const fields = []
  const source = pattern.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/yyyy|MM|M|dd|d/g, token => {
    fields.push(token[0])
    return token.length === 4 ? '(\\d{4})' : token.length === 2 ? '(\\d{2})' : '(\\d{1,2})'
  })
  const m = new RegExp(`^${source}$`).exec(String(text).trim())
  if (m === null) { return null }
  const value = {}
  fields.forEach((field, i) => { value[field] = Number(m[i + 1]) })
  if (value.y === undefined || value.M === undefined || value.d === undefined) { return null }
  const date = toIsoDate(value.y, value.M, value.d)
  return isValidDate(date) ? date : null
}

/**
 * Writes a date in another format.
 * @param {string} date - ISO date.
 * @param {string|object} [format='yyyy-MM-dd'] - A pattern (see the module), or the options of
 *   `Intl.DateTimeFormat` (`{dateStyle: 'full'}`, `{month: 'long', year: 'numeric'}`).
 * @param {string} [locale] - The language of the names of months and days (`'fr'`); default: that of the browser.
 * @returns {string} The date written; `''` for an invalid date.
 */
export const formatDate = (date, format = 'yyyy-MM-dd', locale) => {
  if (!isValidDate(date)) { return '' }
  if (typeof format === 'object') {
    return new Intl.DateTimeFormat(locale, {...format, timeZone: 'UTC'}).format(utcDate(date))
  }
  const [y, m, d] = partsOf(date)
  const name = options => new Intl.DateTimeFormat(locale, {...options, timeZone: 'UTC'}).format(utcDate(date))
  return format.replace(PATTERN_TOKEN, token => {
    switch (token) {
      case 'yyyy': return pad(y, 4)
      case 'MMMM': return name({month: 'long'})
      case 'MMM': return name({month: 'short'})
      case 'MM': return pad(m, 2)
      case 'M': return String(m)
      case 'dd': return pad(d, 2)
      case 'd': return String(d)
      case 'EEEE': return name({weekday: 'long'})
      case 'EEE': return name({weekday: 'short'})
      default: return token.slice(1, -1) // 'text'
    }
  })
}

/**
 * Rewrites a date from one format to another (see the patterns of the module), in one call: `parseDate()` then
 * `formatDate()`.
 *
 * ```js
 * convertDate('20/10/2026', 'dd/MM/yyyy', 'yyyyMMdd') // '20261020'
 * convertDate('2026-10-20', 'yyyy-MM-dd', 'dd/MM/yyyy') // '20/10/2026'
 * convertDate('31/02/2026', 'dd/MM/yyyy') // '' : no such date
 * ```
 * @param {string} text - The date, written in the format `from`.
 * @param {string} [from='yyyy-MM-dd'] - Its format.
 * @param {string} [to='yyyy-MM-dd'] - The format wanted.
 * @returns {string} The date in the format `to`, or `''` if the text is empty or is not a date of the format `from`.
 */
export const convertDate = (text, from = 'yyyy-MM-dd', to = 'yyyy-MM-dd') => {
  const date = parseDate(text ?? '', from)
  return date === null ? '' : formatDate(date, to)
}

/**
 * Splits a duration.
 * @param {number} milliseconds - The duration, in milliseconds (positive).
 * @returns {{days: number, hours: number, minutes: number, seconds: number, milliseconds: number}} The parts.
 */
export const splitDuration = milliseconds => {
  let rest = Math.floor(Math.abs(milliseconds))
  const ms = rest % 1000
  rest = Math.floor(rest / 1000)
  const seconds = rest % 60
  rest = Math.floor(rest / 60)
  const minutes = rest % 60
  rest = Math.floor(rest / 60)
  return {days: Math.floor(rest / 24), hours: rest % 24, minutes, seconds, milliseconds: ms}
}

const DURATION_UNITS = [['days', 'day'], ['hours', 'hour'], ['minutes', 'minute'], ['seconds', 'second']]

/**
 * Writes a duration in a language: `'2 jours, 3 heures et 5 secondes'`. Units equal to zero are left out.
 * @param {number} milliseconds - The duration, in milliseconds; below a second, it is written in seconds.
 * @param {{locale: string, style: string}} [options] - `locale`: the language, default that of the browser; `style`:
 *   `'long'` (default, `3 heures`), `'short'` (`3 h`) or `'narrow'` (`3h`).
 * @returns {string} The duration written.
 */
export const formatDuration = (milliseconds, {locale, style = 'long'} = {}) => {
  const parts = splitDuration(milliseconds)
  const texts = DURATION_UNITS
    .filter(([field]) => parts[field] > 0)
    .map(([field, unit]) => new Intl.NumberFormat(locale, {style: 'unit', unit, unitDisplay: style}).format(parts[field]))
  if (texts.length === 0) {
    return new Intl.NumberFormat(locale, {style: 'unit', unit: 'second', unitDisplay: style}).format(0)
  }
  return new Intl.ListFormat(locale, {style: style === 'long' ? 'long' : 'narrow', type: style === 'long' ? 'conjunction' : 'unit'}).format(texts)
}
