// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A button made of text, or of any content: a click runs the actions of its `data-*` attributes (see the `actions`
 * module).
 *
 * ```html
 * <rc-text-button data-event="gameStart">Start the game</rc-text-button>
 * <rc-text-button flat data-path="#books">Books</rc-text-button>
 * <rc-text-button link data-url="https://example.com">Read more</rc-text-button>
 * <rc-text-button palette="action" class="rc-shadow-2 rc-text-shadow" data-event="formSave">Save</rc-text-button>
 * ```
 *
 * - **Content**: what is written inside the element, moved into a `<button>`; it may hold other elements, such as an
 *   `rc-icon`. The `label` attribute replaces it with a text.
 * - **Look** (see the `button-style` module): by default, the button stands on the surface of its block; `flat`
 *   removes the background and the border (a breadcrumb); `link` shows a link; `palette` and `shade` give it the
 *   surface of a palette, for an action that stands out.
 * - **Keyboard**: a real `<button>`: it takes the focus with `Tab`, and `Enter` or `Space` click it.
 * - **Disabled**: with the `disabled` attribute, the button cannot be clicked and its actions do not run.
 *
 * An application gives its buttons a look of its own with a palette of its own, which may set tokens directly, its own
 * classes, and the shadow classes of the `theme` module:
 *
 * ```css
 * [palette="action"] {
 *   --rc-surface: light-dark(oklch(48% .12 235), oklch(42% .1 235));
 *   --rc-text: oklch(98% .01 235);
 * }
 * ```
 *
 * Centring a button, or giving it a width, is the layout of the application: its CSS sets them on `rc-text-button`.
 *
 * @module rc-text-button
 * @category ui
 */

import {WComponent} from '../core/w-component.mjs'
import '../core/actions.mjs'
import './button-style.mjs'

/**
 * The component of `<rc-text-button>`.
 * @attr {string} [label] - Text of the button; default: the content of the element.
 * @attr {boolean} [disabled] - The button cannot be clicked.
 * @attr {boolean} [flat] - No background nor border.
 * @attr {boolean} [link] - Looks like a link.
 * @attr {string} [data-*] - Actions run by a click (see the `actions` module).
 */
export class RcTextButton extends WComponent {
  static observedAttributes = ['label', 'disabled']
  static display = 'inline-block'

  attach () {
    this.elButton = document.createElement('button')
    this.elButton.type = 'button'
    this.elButton.append(...this.element.childNodes) // the content moves into the button
    this.content = [...this.elButton.childNodes]
    this.element.append(this.elButton)
  }

  labelChanged (label) {
    if (label === null) {
      this.elButton.replaceChildren(...this.content)
    } else {
      this.elButton.textContent = label
    }
  }

  disabledChanged (disabled) { this.elButton.disabled = disabled !== null }
}
WComponent.define('rc-text-button', RcTextButton)
