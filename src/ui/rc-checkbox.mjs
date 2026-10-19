// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A checkbox: an `rc-icon-button` whose icon shows a state, checked or not. A click changes the state, then runs the
 * actions of its `data-*` attributes (see the `actions` module) with the new value, `yes` or `no`, in `data-value`.
 *
 * ```html
 * <rc-checkbox data-item="board-grid">Grid</rc-checkbox>
 * <rc-checkbox data-event="layerShow" data-param='{"layer": "roads"}' checked>Roads</rc-checkbox>
 * <rc-checkbox name="loop" title="Play in a loop"></rc-checkbox>
 * ```
 *
 * ## State
 *
 * The state is the `checked` attribute: present when the box is checked. Writing it in the HTML gives the initial
 * state; adding or removing it later changes the state. The checkbox adds and removes it itself when it is clicked.
 * The `value` property of the component (`element._component.value`) reads and writes the same state as `yes` or
 * `no`. Changing the state by the attribute or by `value` runs no action: only a click does.
 *
 * ## Uses
 *
 * | Use | How |
 * | --- | --- |
 * | A configuration item | `data-item="name"`: the box shows the item, and a click sets it to `yes` or `no`. Nothing else is needed: when the item changes elsewhere, the box follows. An item not yet set leaves the initial state. |
 * | An event | `data-event="name"`, with `data-param` for the payload: a click emits the event with `value` added to the payload. |
 * | A form | no action: the box is read with `value` (or the `checked` attribute) when the form is validated. |
 *
 * `data-value` is written by the checkbox: it must not be given.
 *
 * ## Look
 *
 * Like a flat `rc-icon-button`: no background, the hover and pressed states of the palette, the focus ring with the
 * keyboard. The icon is `square`, or `checksquare` in the colour `--rc-selected` when the box is checked.
 *
 * ## Keyboard and screen readers
 *
 * The checkbox holds a `<button role="checkbox">` with `aria-checked`: it takes the focus with `Tab`, and `Space` or
 * `Enter` change its state.
 *
 * @module rc-checkbox
 * @category ui
 * @attr {boolean} [checked] - The box is checked.
 * @attr {number} [size=20] - Size of the icon, in pixels.
 * @attr {string} [label] - Label; default: the text inside the element.
 * @attr {string} [title] - Tooltip; names the checkbox when it has no label.
 * @attr {boolean} [disabled] - The state cannot be changed, and the actions do not run.
 * @attr {string} [data-item] - Configuration item shown and set by the box (`yes` or `no`).
 * @attr {string} [data-*] - Other actions run by a click (see the `actions` module).
 */

import {css} from '../core/css.mjs'
import {isDisabled} from '../core/actions.mjs'
import {WComponent} from '../core/w-component.mjs'
import {RcIconButton} from './rc-icon-button.mjs'

css(`
rc-checkbox[checked]:not([disabled]) > button > rc-icon { color: var(--rc-selected); }
`, {layer: 'ricochet'})

/**
 * The component of `<rc-checkbox>`.
 */
export class RcCheckbox extends RcIconButton {
  static observedAttributes = ['checked', 'size', 'label', 'title', 'disabled']

  /** The state: `yes` or `no`. */
  get value () { return this.element.hasAttribute('checked') ? 'yes' : 'no' }
  set value (value) { this.element.toggleAttribute('checked', value === 'yes') }

  attach () {
    super.attach()
    this.elButton.setAttribute('role', 'checkbox')
    this.observeDom(this.element, 'click', 'clicked')
    this.item = this.element.dataset.item
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
  }

  checkedChanged (checked) {
    const value = checked === null ? 'no' : 'yes'
    this.elIcon.setAttribute('icon', value === 'yes' ? 'checksquare' : 'square')
    this.elButton.setAttribute('aria-checked', value === 'yes' ? 'true' : 'false')
    this.element.dataset.value = value
  }

  itemsChanged (items) {
    const value = items[this.item]
    if (value === undefined || value === null) { return } // not set yet: the initial state stays
    this.value = value
  }

  // the listener of the element runs before the one of the document: the actions see the new state
  clicked (e) {
    if (isDisabled(e.target)) { return }
    this.value = this.value === 'yes' ? 'no' : 'yes'
  }
}
WComponent.define('rc-checkbox', RcCheckbox)
