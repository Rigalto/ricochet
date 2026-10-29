// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The grid of a month: the names of the days, then the weeks, Monday first, each day a button. A click on a day emits
 * the event named by the `event` attribute, with the date as payload: `{date: '2026-10-29'}` (see the `actions`
 * module). The navigation between months (previous, next, today) is the business of the block around it: it changes
 * the `month` attribute.
 *
 * ```html
 * <rc-month month="2026-10" value="2026-10-29" event="calendarDate" labels="Lu, Ma, Me, Je, Ve, Sa, Di"></rc-month>
 * ```
 *
 * ## Attributes
 *
 * | Attribute | Role |
 * | --- | --- |
 * | `month` | the month shown, `YYYY-MM` or `YYYY-MM-DD` (the day is ignored); default: the month of `value`, else the current month |
 * | `value` | the chosen date, `YYYY-MM-DD`, shown filled in `--rc-selected` when it is in the weeks shown |
 * | `today` | the date of today, `YYYY-MM-DD`, circled; default: the date of the computer; `none`: not shown |
 * | `weeks` | `6` (default): six weeks always; `auto`: the room of six weeks, the last weeks hidden when all their days are outside the month; `compact`: four to six weeks, the height changes with the month |
 * | `event` | the name of the event emitted by a click on a day |
 * | `labels` | the seven names of the days, Monday first, separated by `,`, `, ` or `|`; default: `Mo, Tu, We, Th, Fr, Sa, Su` |
 *
 * The days of the previous and the next month are shown faint, and can be clicked like the others.
 *
 * ## Changes
 *
 * The grid is built once: seven names and forty-two buttons. After that, a change of an attribute changes the
 * buttons in place:
 *
 * - another `value` or `today`: the mark moves from one button to another;
 * - another `month`: the number of each button, its date (`data-param`) and its faint state are rewritten, and the
 *   last weeks are shown or hidden according to `weeks`.
 *
 * ## Keyboard and screen readers
 *
 * The grid is a `grid`; each day is a `gridcell`, with `aria-selected` on the chosen date and the full date as its
 * name. `Tab` reaches one day only: the chosen date, else today, else the first day of the month. Then the arrows move
 * between the days (`←` `→` one day, `↑` `↓` one week, `Home` `End` the first and last day of the week), the focus ring
 * showing where the keyboard is; `Enter` or `Space` clicks the day.
 *
 * ## Look
 *
 * The colours come from the palette of the block: the names of the days in `--rc-text-muted`, the days of the month in
 * `--rc-text-strong`, the other days in `--rc-text-faint`; the chosen date filled with `--rc-selected`, today circled
 * with it. The days are round; their size follows the width of the grid.
 *
 * @module rc-month
 * @category ui
 */

import {css} from '../core/css.mjs'
import {WComponent} from '../core/w-component.mjs'

const DAY = 86400000
const CELLS = 42
const LABELS = 'Mo, Tu, We, Th, Fr, Sa, Su'
const WEEKS = new Set(['6', 'auto', 'compact'])

// a date 'YYYY-MM-DD' (or 'YYYY-MM') → milliseconds at midnight UTC, or null
const parse = (text, monthOnly = false) => {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(text ?? '')
  if (match === null) { return null }
  const [, year, month, day] = match
  return Date.UTC(Number(year), Number(month) - 1, monthOnly || day === undefined ? 1 : Number(day))
}

// milliseconds at midnight UTC → 'YYYY-MM-DD'
const format = time => new Date(time).toISOString().slice(0, 10)

// the date of the computer, 'YYYY-MM-DD'
const localToday = () => {
  const now = new Date()
  return format(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

css(`
rc-month { grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; }
rc-month > [role="row"] { display: contents; }
rc-month .rc-month-label {
  padding: .2em 0; font-size: .85em; color: var(--rc-text-muted); overflow: hidden; text-overflow: ellipsis;
}
rc-month .rc-month-day {
  justify-self: center; width: 100%; max-width: 2.5em; aspect-ratio: 1; padding: 0; border: 2px solid transparent;
  border-radius: 50%; background: none; font: inherit; font-variant-numeric: tabular-nums; cursor: pointer;
  color: var(--rc-text-strong);
}
rc-month .rc-month-day[outside] { color: var(--rc-text-faint); }
rc-month .rc-month-day[today] { border-color: var(--rc-selected); }
rc-month .rc-month-day[aria-selected="true"] {
  background: var(--rc-selected); color: light-dark(white, oklch(.18 0 0)); font-weight: 600;
}
rc-month .rc-month-day[blank] { visibility: hidden; }
rc-month .rc-month-day[hidden] { display: none; }
rc-month .rc-month-day:focus-visible { outline: 2px solid var(--rc-focus); outline-offset: 1px; }
@media (hover: hover) {
  rc-month .rc-month-day:hover:not([aria-selected="true"]) {
    background: color-mix(in oklch, var(--rc-accent) 22%, transparent);
  }
}
`, {layer: 'ricochet'})

/**
 * The component of `<rc-month>`.
 * @attr {string} [month] - The month shown, `YYYY-MM` or `YYYY-MM-DD`.
 * @attr {string} [value] - The chosen date, `YYYY-MM-DD`.
 * @attr {string} [today] - The date of today, `YYYY-MM-DD`, or `none`.
 * @attr {string} [weeks=6] - `6`, `auto` or `compact`.
 * @attr {string} [event] - The event emitted by a click on a day, with `{date}` as payload.
 * @attr {string} [labels] - The seven names of the days, Monday first.
 */
export class RcMonth extends WComponent {
  static observedAttributes = ['month', 'value', 'today', 'weeks', 'event', 'labels']
  static display = 'grid'

  attach () {
    const element = this.element
    element.setAttribute('role', 'grid')
    const labels = Array.from({length: 7}, () => '<span class="rc-month-label" role="columnheader"></span>').join('')
    const week = Array.from({length: 7}, () => '<button type="button" class="rc-month-day" role="gridcell" tabindex="-1"></button>').join('')
    element.innerHTML = `<div role="row">${labels}</div>` +
      Array.from({length: 6}, () => `<div role="row">${week}</div>`).join('')
    this.elLabels = [...element.querySelectorAll('.rc-month-label')]
    this.cells = [...element.querySelectorAll('.rc-month-day')]
    this.dates = new Array(CELLS).fill('') // the date of each button
    this.first = null // the date of the first button, in milliseconds
    this.chosen = -1 // the index of the chosen button, -1 when the chosen date is not shown
    this.marked = -1 // the index of the button of today
    this.tabbed = -1 // the index of the button reached by Tab
    this.observeDom(element, 'keydown', 'keyPressed')
  }

  monthChanged () { this.#layout() }

  valueChanged () {
    // without month, the month shown is the one of the chosen date
    if (!this.element.hasAttribute('month')) { this.#layout() } else { this.#marks() }
  }

  todayChanged () { this.#marks() }

  weeksChanged () { this.#layout() }

  eventChanged (event) {
    for (const cell of this.cells) {
      if (event === null || event === '') { cell.removeAttribute('data-event') } else { cell.dataset.event = event }
    }
  }

  labelsChanged (labels) {
    const names = (labels ?? LABELS).split(/\s*[,|]\s*/)
    if (names.length !== 7) { console.warn(`rc-month: labels must give seven names, not '${labels}'`) }
    this.elLabels.forEach((label, i) => { label.textContent = names[i] ?? '' })
  }

  /**
   * The arrows, `Home` and `End` move the focus between the days.
   * @param {KeyboardEvent} e - The key pressed in the grid.
   */
  keyPressed (e) {
    const index = this.cells.indexOf(e.target)
    if (index === -1) { return }
    const steps = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -(index % 7), End: 6 - (index % 7)}
    const step = steps[e.key]
    if (step === undefined || e.ctrlKey || e.altKey || e.metaKey) { return }
    e.preventDefault()
    const target = this.cells[index + step]
    if (target === undefined || target.hidden || target.hasAttribute('blank')) { return }
    this.#tab(index + step)
    target.focus()
  }

  // the month shown: the number, the date and the faint state of each button, and the weeks shown
  #layout () {
    const element = this.element
    const month = parse(element.getAttribute('month'), true) ??
      parse(element.getAttribute('value'), true) ?? parse(localToday(), true)
    const start = new Date(month)
    const offset = (start.getUTCDay() + 6) % 7 // Monday first
    const first = month - offset * DAY
    const days = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate()
    const rows = Math.ceil((offset + days) / 7) // 4 to 6 weeks hold the days of the month
    const weeks = WEEKS.has(element.getAttribute('weeks')) ? element.getAttribute('weeks') : '6'
    const formatter = this.#formatter()
    if (first !== this.first) {
      this.first = first
      this.cells.forEach((cell, i) => {
        const time = first + i * DAY
        const date = format(time)
        this.dates[i] = date
        cell.textContent = String(new Date(time).getUTCDate())
        cell.dataset.param = `{"date": "${date}"}`
        cell.setAttribute('aria-label', formatter.format(time))
        const outside = i < offset || i >= offset + days
        if (outside !== cell.hasAttribute('outside')) { cell.toggleAttribute('outside', outside) }
      })
    }
    this.cells.forEach((cell, i) => {
      const beyond = Math.floor(i / 7) >= rows
      cell.toggleAttribute('blank', beyond && weeks === 'auto')
      cell.hidden = beyond && weeks === 'compact'
    })
    this.#marks(true)
  }

  // the chosen date and today: the marks move from one button to another
  #marks (all = false) {
    if (this.first === null) { return }
    const element = this.element
    const today = element.getAttribute('today') ?? localToday()
    const chosen = this.dates.indexOf(element.getAttribute('value') ?? '')
    const marked = today === 'none' ? -1 : this.dates.indexOf(today)
    if (chosen !== this.chosen || all) {
      this.cells[this.chosen]?.removeAttribute('aria-selected')
      if (chosen !== -1) { this.cells[chosen].setAttribute('aria-selected', 'true') }
      this.chosen = chosen
    }
    if (marked !== this.marked || all) {
      this.cells[this.marked]?.removeAttribute('today')
      if (marked !== -1) { this.cells[marked].setAttribute('today', '') }
      this.marked = marked
    }
    // the day reached by Tab: the chosen date, else today, else the first day of the month
    const visible = i => i !== -1 && !this.cells[i].hidden && !this.cells[i].hasAttribute('blank')
    this.#tab(visible(chosen) ? chosen : visible(marked) ? marked : this.cells.findIndex(cell => !cell.hasAttribute('outside')))
  }

  #tab (index) {
    if (index === this.tabbed) { return }
    this.cells[this.tabbed]?.setAttribute('tabindex', '-1')
    this.cells[index]?.setAttribute('tabindex', '0')
    this.tabbed = index
  }

  // the full date, for screen readers, in the language of the page
  #formatter () {
    const lang = this.element.closest('[lang]')?.getAttribute('lang') || undefined
    this.formatters ??= new Map()
    if (!this.formatters.has(lang)) {
      this.formatters.set(lang, new Intl.DateTimeFormat(lang, {timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}))
    }
    return this.formatters.get(lang)
  }
}

WComponent.define('rc-month', RcMonth)
