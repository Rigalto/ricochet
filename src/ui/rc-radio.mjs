// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Radio buttons: a group, `rc-radio-group`, holds the value; each `rc-radio` inside it offers one value. A click on a
 * radio selects its value, then runs the actions of the `data-*` attributes of the group (see the `actions` module),
 * with the new value in `data-value`.
 *
 * ```html
 * <rc-radio-group data-item="sudoku-start" value="copy">
 *   <rc-radio value="copy">Copy the grid</rc-radio>
 *   <rc-radio value="new">Generate</rc-radio>
 * </rc-radio-group>
 *
 * <rc-radio-group data-event="mapLayer" data-param='{"map": "world"}' vertical>
 *   <rc-radio value="roads">Roads</rc-radio>
 *   <rc-radio value="rivers" disabled>Rivers</rc-radio>
 * </rc-radio-group>
 * ```
 *
 * ## Value
 *
 * The value is the `value` attribute of the group: the radio with the same `value` is checked, the others are not;
 * none is checked when no radio has it. Writing it in the HTML gives the initial value; changing it later changes the
 * selection. The group changes it itself when a radio is clicked. The `value` property of the component
 * (`element._component.value`) reads and writes the same value. Changing the value by the attribute or by `value` runs
 * no action: only a click does. A click on the radio already checked runs nothing either.
 *
 * ## Uses
 *
 * | Use | How |
 * | --- | --- |
 * | A configuration item | `data-item="name"` on the group: the radios show the item, and a click sets it. Nothing else is needed: when the item changes elsewhere, the radios follow. An item not yet set leaves the initial value. |
 * | An event | `data-event="name"` on the group, with `data-param` for the payload: a click emits the event with `value` added to the payload. |
 * | A form | no action: the group is read with `value` (or its `value` attribute) when the form is validated. |
 *
 * `data-value` is written by the group: it must not be given. The actions are written on the group, not on the
 * radios.
 *
 * ## Look
 *
 * The radios look like flat `rc-icon-button`s: no background, the hover and pressed states of the palette, the focus
 * ring with the keyboard. The icon is `radiooff`, or `radioon` in the colour `--rc-selected` for the checked radio.
 * The radios of a group are side by side, wrapping on several lines when needed; the `vertical` attribute puts them
 * one under the other.
 *
 * ## Disabled
 *
 * A radio with `disabled` cannot be selected; a group with `disabled` disables all its radios.
 *
 * ## Keyboard and screen readers
 *
 * The group has `role="radiogroup"`, and each radio holds a `<button role="radio">` with `aria-checked`. `Tab` reaches
 * each radio, `Space` or `Enter` select it, and the arrows select the next or the previous radio of the group, skipping
 * the disabled ones.
 *
 * @module rc-radio
 * @category ui
 */

import {css} from '../core/css.mjs'
import {isDisabled} from '../core/actions.mjs'
import {WComponent} from '../core/w-component.mjs'
import {RcIconButton} from './rc-icon-button.mjs'

css(`
rc-radio-group { flex-wrap: wrap; align-items: center; gap: .1em .5em; }
rc-radio-group[vertical] { flex-direction: column; align-items: flex-start; }
rc-radio[checked] > button, rc-radio[checked] > button:hover { cursor: default; background: transparent; }
rc-radio-group:not([disabled]) rc-radio[checked]:not([disabled]) > button > rc-icon { color: var(--rc-selected); }
rc-radio-group[disabled] rc-radio > button,
rc-radio-group[disabled] rc-radio > button:hover {
  color: var(--rc-disabled);
  background: transparent;
  cursor: not-allowed;
}
`, {layer: 'ricochet'})

const NEXT = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}

/**
 * The component of `<rc-radio>`: one radio button of an `rc-radio-group`.
 * @attr {string} value - The value the radio offers; default: its label.
 * @attr {string} [label] - Label; default: the text inside the element.
 * @attr {string} [title] - Tooltip; names the radio when it has no label.
 * @attr {number} [size=20] - Size of the icon, in pixels.
 * @attr {boolean} [disabled] - The radio cannot be selected.
 * @attr {boolean} [checked] - Set by the group: the radio is the selected one.
 */
export class RcRadio extends RcIconButton {
  static observedAttributes = ['checked', 'size', 'label', 'title', 'disabled']

  attach () {
    super.attach()
    this.elButton.setAttribute('role', 'radio')
    if (!this.element.hasAttribute('value')) { this.element.setAttribute('value', this.defaultLabel) }
    // a radio added after its group follows the value of the group
    const group = this.element.closest('rc-radio-group')
    if (group !== null && group.hasAttribute('value')) {
      this.element.toggleAttribute('checked', group.getAttribute('value') === this.element.getAttribute('value'))
    }
  }

  checkedChanged (checked) {
    this.elIcon.setAttribute('icon', checked === null ? 'radiooff' : 'radioon')
    this.elButton.setAttribute('aria-checked', checked === null ? 'false' : 'true')
  }
}

/**
 * The component of `<rc-radio-group>`: holds the value of its radios.
 * @attr {string} [value] - The selected value.
 * @attr {boolean} [vertical] - The radios are one under the other.
 * @attr {boolean} [disabled] - Every radio of the group is disabled.
 * @attr {string} [data-item] - Configuration item shown and set by the group.
 * @attr {string} [data-*] - Other actions run when a radio is selected by a click (see the `actions` module).
 */
export class RcRadioGroup extends WComponent {
  static observedAttributes = ['value', 'disabled']
  static display = 'flex'

  /** The selected value, `''` if none. */
  get value () { return this.element.getAttribute('value') ?? '' }
  set value (value) { this.element.setAttribute('value', value) }

  attach () {
    this.element.setAttribute('role', 'radiogroup')
    this.changed = false
    this.observeDom(this.element, 'click', 'clicked')
    this.observeDom(this.element, 'keydown', 'keyPressed')
    this.item = this.element.dataset.item
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
  }

  valueChanged (value) {
    for (const radio of this.#radios()) { radio.toggleAttribute('checked', value !== null && radio.getAttribute('value') === value) }
    this.element.dataset.value = value ?? ''
  }

  disabledChanged (disabled) {
    if (disabled === null) {
      this.element.removeAttribute('aria-disabled')
    } else {
      this.element.setAttribute('aria-disabled', 'true')
    }
  }

  itemsChanged (items) {
    const value = items[this.item]
    if (value === undefined || value === null) { return } // not set yet: the initial value stays
    this.value = value
  }

  // the listener of the element runs before the one of the document: the actions see the new value
  clicked (e) {
    this.changed = false
    const radio = e.target.closest('rc-radio')
    if (radio === null || !this.element.contains(radio) || isDisabled(e.target)) { return }
    const value = radio.getAttribute('value')
    if (value === this.value) { return }
    this.changed = true
    this.value = value
  }

  /**
   * Called by the delegation of the actions: they run only if the click changed the value.
   * @returns {boolean} True if the last click selected another radio.
   */
  acceptsClick () { return this.changed }

  // the arrows select the next or the previous enabled radio, as a click would
  keyPressed (e) {
    const step = NEXT[e.code]
    if (step === undefined || isDisabled(this.element)) { return }
    const current = e.target.closest('rc-radio')
    const radios = this.#radios().filter(radio => !isDisabled(radio))
    const index = radios.indexOf(current)
    if (index === -1 || radios.length < 2) { return }
    e.preventDefault()
    const button = radios[(index + step + radios.length) % radios.length].querySelector('button')
    if (button === null) { return }
    button.focus()
    button.click()
  }

  #radios () { return [...this.element.querySelectorAll('rc-radio')] }
}

WComponent.define('rc-radio', RcRadio)
WComponent.define('rc-radio-group', RcRadioGroup)
