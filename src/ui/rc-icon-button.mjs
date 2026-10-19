// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A button made of an icon and an optional label. A click runs the actions of its `data-*` attributes (see the
 * `actions` module): no JavaScript is needed.
 *
 * ```html
 * <rc-icon-button icon="save" data-event="noteSave" data-param='{"id": 12}'>Save</rc-icon-button>
 * <rc-icon-button icon="trash" data-event="noteDelete" title="Delete the note"></rc-icon-button>
 * ```
 *
 * - **Label**: the `label` attribute, or else the text written inside the element. Without a label, only the icon
 *   is shown, and `title` names the button for screen readers.
 * - **Keyboard**: the element holds a real `<button>`: it takes the focus with `Tab`, and `Enter` or `Space` click it.
 * - **Look**: the button stands on the surface of its block (`--rc-surface-raised`); hover, pressed, focus and
 *   disabled states use the tokens of the palette (see the `theme` module). The `flat` attribute removes the
 *   background and the border, for dense toolbars. Shadows come from the classes of the `theme` module
 *   (`rc-shadow-1`, `rc-text-shadow`…).
 * - **Disabled**: with the `disabled` attribute, the button cannot be clicked and its actions do not run.
 *
 * @module rc-icon-button
 * @category ui
 * @attr {string} icon - Name of the icon in the icon set.
 * @attr {number} [size=20] - Size of the icon, in pixels.
 * @attr {string} [label] - Label; default: the text inside the element.
 * @attr {string} [title] - Tooltip; names the button when it has no label.
 * @attr {boolean} [disabled] - The button cannot be clicked.
 * @attr {boolean} [flat] - No background nor border.
 * @attr {string} [data-*] - Actions run by a click (see the `actions` module).
 */

import {WComponent} from '../core/w-component.mjs'
import {css} from '../core/css.mjs'
import '../core/actions.mjs'
import './rc-icon.mjs'

css(`
rc-icon-button { vertical-align: middle; }
rc-icon-button > button {
  display: inline-flex;
  align-items: center;
  gap: .35em;
  margin: 0;
  padding: .3em .55em;
  border: 1px solid color-mix(in oklch, var(--rc-border) 55%, transparent);
  border-radius: 6px;
  background: var(--rc-surface-raised);
  color: inherit;
  font: inherit;
  line-height: 1.2;
  cursor: pointer;
  transition: background-color .12s, border-color .12s;
}
rc-icon-button > button:hover { background: color-mix(in oklch, var(--rc-accent) 30%, var(--rc-surface-raised)); }
rc-icon-button > button:active { background: color-mix(in oklch, var(--rc-accent-active) 55%, var(--rc-surface-raised)); }
rc-icon-button > button:focus-visible { outline: 2px solid var(--rc-focus); outline-offset: 1px; }
rc-icon-button > button:disabled {
  color: var(--rc-disabled);
  background: var(--rc-disabled-surface);
  border-color: transparent;
  cursor: not-allowed;
}
rc-icon-button > button > span:empty { display: none; }
rc-icon-button[flat] > button { background: transparent; border-color: transparent; padding: .2em .3em; }
rc-icon-button[flat] > button:hover { background: color-mix(in oklch, var(--rc-accent) 25%, transparent); }
rc-icon-button[flat] > button:disabled { background: transparent; }
`, {layer: 'ricochet'})

/**
 * The component of `<rc-icon-button>`.
 */
export class RcIconButton extends WComponent {
  static observedAttributes = ['icon', 'size', 'label', 'title', 'disabled']
  static display = 'inline-block'

  attach () {
    this.defaultLabel = this.element.textContent.trim()
    this.innerHTML('<button type="button"><rc-icon></rc-icon><span></span></button>')
    this.elButton = this.element.firstElementChild
    this.elIcon = this.elButton.firstElementChild
    this.elLabel = this.elButton.lastElementChild
  }

  iconChanged (icon) { this.elIcon.setAttribute('icon', icon ?? 'add') }

  sizeChanged (size) { this.elIcon.setAttribute('size', size ?? '20') }

  labelChanged (label) {
    this.elLabel.textContent = label ?? this.defaultLabel
    this.#name()
  }

  titleChanged () { this.#name() }

  disabledChanged (disabled) { this.elButton.disabled = disabled !== null }

  // the accessible name: the label if there is one, else the title
  #name () {
    const title = this.element.getAttribute('title')
    if (this.elLabel.textContent === '' && title !== null) {
      this.elButton.setAttribute('aria-label', title)
    } else {
      this.elButton.removeAttribute('aria-label')
    }
  }
}
WComponent.define('rc-icon-button', RcIconButton)
