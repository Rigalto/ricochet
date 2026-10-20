# date

Module `date` · group `utils` · source [`src/utils/date.mjs`](../../src/utils/date.mjs)

Calendar dates, without hours and without time zones: a birthday, a due date, the day of a note.

## One format: ISO

A date is a string `YYYY-MM-DD` (`'2026-10-20'`): the format of `<input type="date">`, of JSON, of SQL, and of
`Temporal.PlainDate` (the future date API of JavaScript, see below). Two dates in this format compare as strings,
and sort with `sort()`. Other formats are read with `parseDate()` and written with `formatDate()`, at the edges of
the application (a form, a table, an import).

The functions never use the time zone: a date is the same day everywhere, and moving from summer to winter time
never shifts it.

## Patterns

`parseDate()` and `formatDate()` use the letters of Unicode, as `date-fns` and `Intl` do: beware, `yyyy` is the
year and `dd` the day, while `YYYY` and `DD` mean something else there and are not accepted here.

| Letters | Meaning | Example |
| --- | --- | --- |
| `yyyy` | year, 4 digits | 2026 |
| `MM`, `M` | month, 2 digits or as few as possible | 03, 3 |
| `dd`, `d` | day of the month | 07, 7 |
| `MMM`, `MMMM` | name of the month, short or long (`formatDate()` only) | oct., octobre |
| `EEE`, `EEEE` | name of the day, short or long (`formatDate()` only) | mar., mardi |

Any other character is written as it is, and so is a text between apostrophes: `"d 'de' MMMM"`. For the formats of a language, give `formatDate()` the options of
`Intl.DateTimeFormat` instead of a pattern: `formatDate(date, {dateStyle: 'long'}, 'fr')` → `20 octobre 2026`.

## Functions

| Function | Result |
| --- | --- |
| `today()` | the date of the computer |
| `isValidDate(date)` | `true` for an existing date in ISO format |
| `parseDate(text, pattern)`, `formatDate(date, pattern, locale)` | from and to other formats |
| `toIsoDate(year, month, day)` | the ISO date of three numbers |
| `fromDate(date)`, `toDate(date)` | from and to a `Date` object (at midnight, local time) |
| `compareDates(a, b)` | -1, 0 or 1, for `sort()` |
| `addDays`, `addMonths`, `addYears` | a date moved; the 31st becomes the last day of a shorter month |
| `differenceInDays(from, to)` | the number of days between two dates |
| `dateDifference(from, to)` | `{years, months, days}` between two dates: the age of a person |
| `dayOfWeek(date)` | 1 for Monday to 7 for Sunday (ISO) |
| `startOfWeek(date)`, `startOfMonth(date)` | the Monday of the week, the first day of the month |
| `isLeapYear(year)`, `getDaysInMonth(year, month)` | the calendar |
| `splitDuration(ms)`, `formatDuration(ms, options)` | a duration in days, hours, minutes and seconds |

## Temporal

The functions have the meaning of the `Temporal` API: `addMonths()` as `PlainDate.add({months})`,
`dateDifference()` as `until(…, {largestUnit: 'year'})`. When every browser has Temporal (Safari is the last one),
an application can use it with the same ISO strings, without changing its data.

```javascript
import {today, addMonths, formatDate, dateDifference} from 'ricochet/ricochet-utils.mjs'

const due = addMonths(today(), 1)
formatDate(due, 'dd/MM/yyyy') // '20/11/2026'
dateDifference('1990-05-14', today()).years // 36
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `isLeapYear` | function | Tells whether a year has a 29 February. |
| `getDaysInMonth` | function | The number of days of a month. |
| `isValidDate` | function | Tells whether a string is an existing date, in ISO format. |
| `toIsoDate` | function | The ISO date of three numbers. |
| `fromDate` | const | The date of a `Date` object, in local time. |
| `today` | function | The date of today, where the computer is. |
| `toDate` | function | A `Date` object for a date, at midnight, local time. |
| `compareDates` | function | Compares two dates, for `sort()`. |
| `addDays` | function | Moves a date by a number of days. |
| `addMonths` | function | Moves a date by a number of months; a day that does not exist in the new month becomes its last day. |
| `addYears` | function | Moves a date by a number of years; a 29 February becomes a 28 February out of leap years. |
| `differenceInDays` | function | The number of days from one date to another. |
| `dateDifference` | function | The years, months and days from one date to another: whole years, then whole months, then days. |
| `dayOfWeek` | function | The day of the week. |
| `startOfWeek` | function | The Monday of the week of a date. |
| `startOfMonth` | function | The first day of the month of a date. |
| `parseDate` | function | Reads a date written in another format. |
| `formatDate` | function | Writes a date in another format. |
| `splitDuration` | function | Splits a duration. |
| `formatDuration` | function | Writes a duration in a language: `'2 jours, 3 heures et 5 secondes'`. Units equal to zero are left out. |

## Details

### isLeapYear()

Tells whether a year has a 29 February.

| Parameter | Type | Description |
| --- | --- | --- |
| `year` | number | The year. |

**Returns** `boolean` `true` for a leap year.

### getDaysInMonth()

The number of days of a month.

| Parameter | Type | Description |
| --- | --- | --- |
| `year` | number | The year. |
| `month` | number | The month, from 1 to 12. |

**Returns** `number` 28 to 31.

### isValidDate()

Tells whether a string is an existing date, in ISO format.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | The string. |

**Returns** `boolean` `true` for `'2024-02-29'`, `false` for `'2025-02-29'`, `'2025-2-3'` or `''`.

### toIsoDate()

The ISO date of three numbers.

| Parameter | Type | Description |
| --- | --- | --- |
| `year` | number | The year, from 0 to 9999. |
| `month` | number | The month, from 1 to 12. |
| `day` | number | The day of the month. |

**Returns** `string` `YYYY-MM-DD`.

### fromDate

The date of a `Date` object, in local time.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | Date | The moment; default: now. |

**Returns** `string` The ISO date of that day, where the computer is.

### today()

The date of today, where the computer is.

**Returns** `string` The ISO date.

### toDate()

A `Date` object for a date, at midnight, local time.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |

**Returns** `Date` The moment the day starts, where the computer is.

### compareDates()

Compares two dates, for `sort()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | string | ISO date. |
| `b` | string | ISO date. |

**Returns** `number` -1 if `a` is before `b`, 1 if after, 0 if the same day.

### addDays()

Moves a date by a number of days.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |
| `days` | number | Days to add; negative to go back. |

**Returns** `string` The ISO date.

### addMonths()

Moves a date by a number of months; a day that does not exist in the new month becomes its last day.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |
| `months` | number | Months to add; negative to go back. |

**Returns** `string` The ISO date: `addMonths('2026-01-31', 1)` is `'2026-02-28'`.

### addYears()

Moves a date by a number of years; a 29 February becomes a 28 February out of leap years.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |
| `years` | number | Years to add; negative to go back. |

**Returns** `string` The ISO date.

### differenceInDays()

The number of days from one date to another.

| Parameter | Type | Description |
| --- | --- | --- |
| `from` | string | ISO date. |
| `to` | string | ISO date. |

**Returns** `number` Positive if `to` is after `from`.

### dateDifference()

The years, months and days from one date to another: whole years, then whole months, then days.

| Parameter | Type | Description |
| --- | --- | --- |
| `from` | string | ISO date (a date of birth). |
| `to` | string | ISO date (today). |

**Returns** `{years: number, months: number, days: number}` Each negative or zero if `to` is before `from`.

### dayOfWeek()

The day of the week.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |

**Returns** `number` 1 for Monday to 7 for Sunday.

### startOfWeek()

The Monday of the week of a date.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |

**Returns** `string` The ISO date of the Monday (the date itself on a Monday).

### startOfMonth()

The first day of the month of a date.

| Parameter | Type | Description |
| --- | --- | --- |
| `date` | string | ISO date. |

**Returns** `string` The ISO date of the 1st.

### parseDate()

Reads a date written in another format.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `text` | string |  | The text, `'20/10/2026'`. |
| `pattern` | string | `'yyyy-MM-dd'` | Its format, `'dd/MM/yyyy'` (see the module: `yyyy`, `MM`, `M`, `dd`, `d`). |

**Returns** `string|null` The ISO date, or `null` if the text does not follow the pattern or the date does not exist.

### formatDate()

Writes a date in another format.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `date` | string |  | ISO date. |
| `format` | string\|object | `'yyyy-MM-dd'` | A pattern (see the module), or the options of `Intl.DateTimeFormat` (`{dateStyle: 'full'}`, `{month: 'long', year: 'numeric'}`). |
| `locale` | string |  | The language of the names of months and days (`'fr'`); default: that of the browser. |

**Returns** `string` The date written; `''` for an invalid date.

### splitDuration()

Splits a duration.

| Parameter | Type | Description |
| --- | --- | --- |
| `milliseconds` | number | The duration, in milliseconds (positive). |

**Returns** `{days: number, hours: number, minutes: number, seconds: number, milliseconds: number}` The parts.

### formatDuration()

Writes a duration in a language: `'2 jours, 3 heures et 5 secondes'`. Units equal to zero are left out.

| Parameter | Type | Description |
| --- | --- | --- |
| `milliseconds` | number | The duration, in milliseconds; below a second, it is written in seconds. |
| `options` | {locale: string, style: string} | `locale`: the language, default that of the browser; `style`: `'long'` (default, `3 heures`), `'short'` (`3 h`) or `'narrow'` (`3h`). |

**Returns** `string` The duration written.
