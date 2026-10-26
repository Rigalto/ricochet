// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A slider: a number between two bounds, chosen by moving a thumb along a track. When the user moves it, the actions
 * of its `data-*` attributes run (see the `actions` module) with the value in `data-value`.
 *
 * ```html
 * <rc-slider data-item="sound-volume" min="0" max="100" step="5" unit=" %"></rc-slider>
 * <rc-slider data-event="zoomChanged" min="1" max="8" commit="change" label="Zoom"></rc-slider>
 * ```
 *
 * ## Value
 *
 * `min` (default 0), `max` (default 100) and `step` (default 1) bound the value; a value outside them is brought
 * back inside. The `value` attribute gives the value, and changing it later moves the thumb; the moves of the user
 * are not copied to it, as for a native `<input type="range">`. The `value` property of the component
 * (`element._component.value`) reads and writes the value, as a string. Changing the value by the attribute or by
 * `value` runs no action.
 *
 * The value is shown on the right of the track, followed by `unit`; `no-value` hides it.
 *
 * ## Actions
 *
 * | Use | How |
 * | --- | --- |
 * | A configuration item | `data-item="name"`: the slider shows the item, and sets it. When the item changes elsewhere, the slider follows. |
 * | An event | `data-event="name"`, with `data-param` for the payload: the event is emitted with `value` added to the payload. |
 *
 * The `commit` attribute tells when the actions run: `input` (default) while the thumb moves, `change` when the user
 * releases it (or at each key that moves it). A click on the slider runs nothing else (`static clickActions =
 * false`).
 *
 * ## Keyboard and look
 *
 * The slider holds a native `<input type="range">`: it takes the focus with `Tab`, and the arrows, `Page Up`,
 * `Page Down`, `Home` and `End` move the thumb. The part of the track before the thumb is in `--rc-selected`, the rest
 * mixes `--rc-border` with the surface; the thumb stands on `--rc-surface-raised`; the focus ring is `--rc-focus`.
 * The slider takes the width of `rc-slider`, set by the application.
 *
 * @module rc-slider
 * @category ui
 */

import {css} from '../core/css.mjs'
import {runActions} from '../core/actions.mjs'
import {WComponent} from '../core/w-component.mjs'

// the same track and thumb in every browser: WebKit and Blink (-webkit-), Gecko (-moz-)
css(`
rc-slider { align-items: center; gap: .6em; vertical-align: middle; min-width: 8em; }
rc-slider > input {
  flex: 1 1 auto;
  min-width: 0;
  height: 1.25em;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  --rc-track: linear-gradient(to right, var(--rc-selected) var(--rc-fill, 0%),
    color-mix(in oklch, var(--rc-border) 70%, var(--rc-surface)) var(--rc-fill, 0%));
}
rc-slider > input::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: var(--rc-track); }
rc-slider > input::-moz-range-track { height: 6px; border-radius: 3px; background: var(--rc-track); }
rc-slider > input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  margin-top: -5px;
  border: 2px solid var(--rc-selected);
  border-radius: 50%;
  background: var(--rc-surface-raised);
  box-shadow: var(--rc-elevation-1);
}
rc-slider > input::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 2px solid var(--rc-selected);
  border-radius: 50%;
  background: var(--rc-surface-raised);
  box-shadow: var(--rc-elevation-1);
}
@media (hover: hover) { rc-slider > input:hover::-webkit-slider-thumb { background: color-mix(in oklch, var(--rc-accent) 35%, var(--rc-surface-raised)); } }
@media (hover: hover) { rc-slider > input:hover::-moz-range-thumb { background: color-mix(in oklch, var(--rc-accent) 35%, var(--rc-surface-raised)); } }
rc-slider > input:focus { outline: none; }
rc-slider > input:focus-visible::-webkit-slider-thumb { outline: 2px solid var(--rc-focus); outline-offset: 1px; }
rc-slider > input:focus-visible::-moz-range-thumb { outline: 2px solid var(--rc-focus); outline-offset: 1px; }
rc-slider > input:disabled { cursor: not-allowed; --rc-track: color-mix(in oklch, var(--rc-disabled) 40%, var(--rc-surface)); }
rc-slider > input:disabled::-webkit-slider-thumb { border-color: var(--rc-disabled); box-shadow: none; }
rc-slider > input:disabled::-moz-range-thumb { border-color: var(--rc-disabled); box-shadow: none; }
rc-slider > output { min-width: 2.5em; white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; color: var(--rc-text-muted); }
rc-slider[disabled] > output { color: var(--rc-disabled); }
`, {layer: 'ricochet'})

const COMMITS = new Set(['input', 'change'])

/**
 * The component of `<rc-slider>`.
 * @attr {number} [min=0] - Lowest value.
 * @attr {number} [max=100] - Highest value.
 * @attr {number} [step=1] - Step between two values.
 * @attr {number} [value] - The value; a change moves the thumb.
 * @attr {string} [unit] - Text shown after the value.
 * @attr {boolean} [no-value] - The value is not shown.
 * @attr {string} [commit=input] - When the actions run: `input` (while the thumb moves) or `change` (when it is released).
 * @attr {boolean} [disabled] - The slider cannot be moved.
 * @attr {string} [label] - Name of the slider for screen readers; the visible label is outside.
 * @attr {string} [data-item] - Configuration item shown and set by the slider.
 * @attr {string} [data-*] - Other actions run when the user moves the slider (see the `actions` module).
 */
export class RcSlider extends WComponent {
  // the bounds before the value
  static observedAttributes = ['min', 'max', 'step', 'unit', 'no-value', 'disabled', 'label', 'value']
  static clickActions = false
  static display = 'inline-flex'

  /** The value, as a string. */
  get value () { return this.elField.value }
  set value (value) { this.#set(value) }

  attach () {
    this.elField = document.createElement('input')
    this.elField.type = 'range'
    this.elValue = document.createElement('output')
    this.element.replaceChildren(this.elField, this.elValue)
    const commit = this.element.getAttribute('commit') ?? 'input'
    if (!COMMITS.has(commit)) { console.warn(`rc-slider: unknown commit '${commit}', 'input' used`) }
    this.commit = COMMITS.has(commit) ? commit : 'input'
    this.observeDom(this.elField, 'input', 'sliderMoved')
    this.observeDom(this.elField, 'change', 'sliderReleased')
    this.item = this.element.dataset.item
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
    this.#show()
  }

  // ------------------------------------------------------------------ attributes

  minChanged (value) { this.#bound('min', value, '0') }
  maxChanged (value) { this.#bound('max', value, '100') }
  stepChanged (value) { this.#bound('step', value, '1') }

  unitChanged (value) {
    this.unit = value ?? ''
    this.#show()
  }

  noValueChanged (value) { this.elValue.hidden = value !== null }

  disabledChanged (value) { this.elField.disabled = value !== null }

  labelChanged (value) {
    if (value === null) {
      this.elField.removeAttribute('aria-label')
    } else {
      this.elField.setAttribute('aria-label', value)
    }
  }

  valueChanged (value) { if (value !== null) { this.#set(value) } }

  itemsChanged (items) {
    const value = items[this.item]
    if (value === undefined || value === null) { return } // not set yet: the value stays
    this.#set(value)
  }

  // ------------------------------------------------------------------ DOM events

  sliderMoved () {
    this.#show()
    if (this.commit === 'input') { this.#commit() }
  }

  sliderReleased () { if (this.commit === 'change') { this.#commit() } }

  // ------------------------------------------------------------------ internals

  #bound (attribute, value, fallback) {
    const number = value === null || value === '' ? NaN : Number(value)
    if (value !== null && value !== '' && Number.isNaN(number)) { console.warn(`rc-slider: ${attribute}="${value}" is not a number, ignored`) }
    this.elField[attribute] = Number.isNaN(number) ? fallback : `${number}`
    // the browser brings the value back between the bounds, on the step
    if (this.wanted !== undefined) { this.elField.value = this.wanted }
    this.#show()
  }

  // a value written by the application: brought between the bounds by the browser, shown, no action
  #set (value) {
    this.wanted = `${value}`
    this.elField.value = this.wanted
    this.#show()
  }

  // the value on the right, and the part of the track before the thumb
  #show () {
    const value = this.elField.value
    this.elValue.textContent = `${value}${this.unit ?? ''}`
    this.element.dataset.value = value
    const min = Number(this.elField.min || 0)
    const max = Number(this.elField.max || 100)
    const fill = max > min ? (Number(value) - min) / (max - min) * 100 : 0
    this.elField.style.setProperty('--rc-fill', `${fill}%`)
  }

  #commit () {
    this.wanted = this.elField.value
    runActions(this.element.dataset)
  }
}
WComponent.define('rc-slider', RcSlider)
