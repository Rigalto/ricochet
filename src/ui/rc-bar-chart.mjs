// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A bar chart, drawn in SVG: one bar per value, a vertical scale, labels under the bars, and marks that separate
 * groups of bars (a month, a year). The application gives the bars; the chart draws them with the colours of the
 * theme. Too many bars for the width: the chart scrolls horizontally, shown at its end (the last bars).
 *
 * ```html
 * <rc-bar-chart label="Tasks completed per day" height="160"></rc-bar-chart>
 * ```
 *
 * ```javascript
 * chart._component.bars = [
 *   {value: 3, label: '26', title: 'Thursday 26/11: 3'},
 *   {value: 5, label: '27', title: 'Friday 27/11: 5', mark: 'Dec. 2026'}
 * ]
 * ```
 *
 * ## The bars
 *
 * `bars` (property of the component, `element._component.bars`) is an array of objects:
 *
 * | Key | Use |
 * | --- | --- |
 * | `value` | The height of the bar (a number, 0 or more; another value counts as 0). |
 * | `label` | A short text under the bar (`'27'`); empty: none. The application gives one every few bars when they are many. |
 * | `title` | The text shown when the mouse is on the bar (default: the value). |
 * | `mark` | A text that starts a group at this bar (`'Dec. 2026'`): a vertical line before the bar, the text under the labels (left out when it would cover the text of the previous mark). |
 *
 * Giving `bars` again draws the chart again. No bar: the chart shows `empty` (default `No data`).
 *
 * ## The scale
 *
 * The top of the scale is the highest value rounded up to 1, 2 or 5 times a power of ten (`niceMax`); three lines
 * cross the chart, with their values on the left. The value of each bar is written above it with `values`.
 *
 * ## Size and look
 *
 * `height` (default 160) is the height of the drawing in pixels; `bar-width` (default 14) the width of a bar, with a
 * gap of a third of it. The chart takes the width of `rc-bar-chart`, set by the application; wider, it scrolls. The
 * bars are in `--rc-selected`, the lines and texts in `--rc-border` and `--rc-text-muted`. `label` names the chart for
 * screen readers.
 *
 * @module rc-bar-chart
 * @category ui
 */

import {css} from '../core/css.mjs'
import {WComponent} from '../core/w-component.mjs'
import {escapeHtml} from '../utils/dom.mjs'

css(`
rc-bar-chart { overflow-x: auto; overflow-y: hidden; max-width: 100%; }
rc-bar-chart > svg { display: block; }
rc-bar-chart .rc-bar { fill: var(--rc-selected); }
@media (hover: hover) { rc-bar-chart .rc-bar:hover { fill: var(--rc-accent); } }
rc-bar-chart .rc-grid { stroke: var(--rc-border); stroke-width: 1; opacity: .6; }
rc-bar-chart .rc-mark { stroke: var(--rc-text-muted); stroke-width: 1; stroke-dasharray: 3 3; }
rc-bar-chart text { fill: var(--rc-text-muted); font-size: 11px; font-family: inherit; }
rc-bar-chart .rc-value { fill: var(--rc-text); font-size: 10px; }
rc-bar-chart .rc-empty { padding: 1em; color: var(--rc-text-muted); font-style: italic; }
`, {layer: 'ricochet'})

/**
 * The top of a scale: the highest value rounded up to 1, 2 or 5 times a power of ten; 1 at least.
 * @param {number} max - The highest value.
 * @returns {number}
 */
export const niceMax = max => {
  if (!(max > 0)) { return 1 }
  const power = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 5, 10].find(factor => factor * power >= max)
  return step * power
}

// the space around the bars: the values of the scale on the left, the labels and marks under the bars
const LEFT = 28
const TOP = 12
const BOTTOM = 30
const MARK_CHAR = 6 // the width of a character of a mark, about (11px)

/**
 * The component of `<rc-bar-chart>`.
 * @attr {number} [height=160] - Height of the drawing, in pixels.
 * @attr {number} [bar-width=14] - Width of a bar, in pixels.
 * @attr {boolean} [values] - The value of each bar is written above it.
 * @attr {string} [empty=No data] - Text shown without bars.
 * @attr {string} [label] - Name of the chart for screen readers.
 */
export class RcBarChart extends WComponent {
  static observedAttributes = ['height', 'bar-width', 'values', 'empty', 'label']
  static display = 'block'
  #bars = []

  /** The bars: `[{value, label?, title?, mark?}]`. */
  get bars () { return this.#bars }
  set bars (bars) {
    this.#bars = Array.isArray(bars) ? bars : []
    this.#draw()
  }

  attach () { this.#draw() }

  heightChanged () { this.#draw() }
  barWidthChanged () { this.#draw() }
  valuesChanged () { this.#draw() }
  emptyChanged () { this.#draw() }
  labelChanged () { this.#draw() }

  #number (name, fallback) {
    const value = Number(this.element.getAttribute(name))
    return value > 0 ? value : fallback
  }

  #draw () {
    const bars = this.#bars
    if (bars.length === 0) {
      this.element.innerHTML = `<div class="rc-empty">${escapeHtml(this.element.getAttribute('empty') ?? 'No data')}</div>`
      return
    }
    const height = this.#number('height', 160)
    const barWidth = this.#number('bar-width', 14)
    const gap = Math.max(1, Math.round(barWidth / 3))
    const values = bars.map(bar => (Number(bar.value) > 0 ? Number(bar.value) : 0))
    const top = niceMax(Math.max(...values))
    const plot = height - TOP - BOTTOM
    const width = LEFT + bars.length * (barWidth + gap) + gap
    const y = value => TOP + plot - (value / top) * plot
    const showValues = this.element.hasAttribute('values')
    const parts = []
    for (const fraction of [0, 0.5, 1]) {
      const value = top * fraction
      const line = Math.round(y(value)) + 0.5
      parts.push(`<line class="rc-grid" x1="${LEFT}" x2="${width}" y1="${line}" y2="${line}"/>`,
        `<text x="${LEFT - 4}" y="${line + 4}" text-anchor="end">${Number.isInteger(value) ? value : value.toFixed(1)}</text>`)
    }
    let free = 0 // the first place where the text of a mark can start without covering the previous one
    bars.forEach((bar, index) => {
      const x = LEFT + gap + index * (barWidth + gap)
      const value = values[index]
      if (bar.mark) {
        const line = x - gap / 2
        parts.push(`<line class="rc-mark" x1="${line}" x2="${line}" y1="${TOP}" y2="${height - 4}"/>`)
        if (line + 2 >= free) {
          parts.push(`<text x="${line + 2}" y="${height - 4}">${escapeHtml(bar.mark)}</text>`)
          free = line + 2 + String(bar.mark).length * MARK_CHAR + 4
        }
      }
      const title = escapeHtml(bar.title ?? String(value))
      parts.push(`<rect class="rc-bar" x="${x}" y="${y(value)}" width="${barWidth}" height="${Math.max(0, TOP + plot - y(value))}"><title>${title}</title></rect>`)
      if (showValues && value > 0) {
        parts.push(`<text class="rc-value" x="${x + barWidth / 2}" y="${y(value) - 2}" text-anchor="middle">${value}</text>`)
      }
      if (bar.label) {
        parts.push(`<text x="${x + barWidth / 2}" y="${TOP + plot + 13}" text-anchor="middle">${escapeHtml(bar.label)}</text>`)
      }
    })
    const label = this.element.getAttribute('label')
    this.element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"` +
      ` role="img"${label ? ` aria-label="${escapeHtml(label)}"` : ''}>${parts.join('')}</svg>`
    this.element.scrollLeft = this.element.scrollWidth // the last bars
  }
}

WComponent.define('rc-bar-chart', RcBarChart)
