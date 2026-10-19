// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Floating buttons: round buttons that stay at the bottom of the screen while the view scrolls, for the actions of
 * the view (next card, edit, save…).
 *
 * ```html
 * <rc-floating-bar>
 *   <rc-floating-group name="arrows" class="arrows">
 *     <rc-floating-button icon="caretleft" key="Ctrl-ArrowLeft" title="Previous card" data-path="#…"></rc-floating-button>
 *     <rc-floating-button icon="caretright" key="Ctrl-ArrowRight" title="Next card" data-path="#…"></rc-floating-button>
 *   </rc-floating-group>
 *   <rc-floating-group name="card" side="right" gradient="right">
 *     <rc-floating-button icon="trash" key="Ctrl-Backspace" data-event="cardDelete"></rc-floating-button>
 *     <rc-floating-button icon="pen" key="Ctrl-m" data-event="cardEdit"></rc-floating-button>
 *   </rc-floating-group>
 * </rc-floating-bar>
 * ```
 *
 * ## Place
 *
 * `rc-floating-bar` is the line of the buttons. It is written at the end of the content of the view: while the view
 * is longer than the screen, the line sticks to the bottom of the screen, above the content (`position: sticky`); at
 * the end of the view, it takes its own place below the content, so that the buttons never hide the end of the view.
 * It has the width of the column of the view: the buttons on the right follow the right side of the view.
 *
 * The bar is hidden while a window is open above the page (`overlayChanged`, see the `keyboard` module), and when
 * the page is printed. A click between the buttons reaches the content below.
 *
 * ## Groups
 *
 * `rc-floating-group` holds buttons side by side, on the left of the line, or on the right with `side="right"`.
 *
 * - **Keys**: the `key` attribute of a button (`Ctrl-ArrowLeft`, see the `keyboard` module) clicks it; the group
 *   declares the keys of its buttons as floating keys of the keyboard, under its `name`. A hidden or disabled button
 *   has no key.
 * - **Colours**: the buttons stand on the colour `--rc-floating`, with their icon in `--rc-floating-text`; an
 *   application sets them on a group, in its CSS. With `gradient="right"`, each button is darker than the one on its
 *   left; with `gradient="left"`, than the one on its right.
 *
 * ```css
 * rc-floating-group.arrows { --rc-floating: oklch(70% .15 10); }
 * rc-floating-group[name="card"] { --rc-floating: light-dark(oklch(78% .1 275), oklch(62% .12 275)); }
 * ```
 *
 * ## Buttons
 *
 * `rc-floating-button` is a round `rc-icon-button` (55 px, icon of 33 px): `icon`, `size`, `title` (it names the
 * button), `label`, `disabled`, `key`, `hidden`, and the actions `data-*` (see the `actions` module).
 *
 * @module rc-floating
 * @category ui
 */

import {css} from '../core/css.mjs'
import {keyboard} from '../core/keyboard.mjs'
import {WComponent} from '../core/w-component.mjs'
import {RcIconButton} from './rc-icon-button.mjs'

css(`
rc-floating-bar {
  position: sticky;
  bottom: 11px;
  z-index: 10;
  align-items: flex-end;
  gap: 22px;
  margin-block: 11px;
  pointer-events: none;
}
rc-floating-group {
  gap: 22px;
  --rc-floating: light-dark(oklch(66% .13 275), oklch(56% .13 275));
  --rc-floating-text: oklch(99% .005 275);
}
rc-floating-group[side="right"] { margin-inline-start: auto; }
rc-floating-group:is([palette], [shade], [scheme]) { background: transparent; }
rc-floating-button { pointer-events: auto; }
rc-floating-button > button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .35em;
  min-width: 55px;
  height: 55px;
  margin: 0;
  padding: 0 11px;
  border: none;
  border-radius: 28px;
  background: var(--rc-floating);
  background: oklch(from var(--rc-floating) calc(l - var(--rc-rank, 0) * .07) c h);
  color: var(--rc-floating-text);
  font: inherit;
  box-shadow: var(--rc-elevation-2);
  cursor: pointer;
  transition: filter .12s, box-shadow .12s;
}
rc-floating-button > button:hover { filter: brightness(1.08); box-shadow: var(--rc-elevation-3); }
rc-floating-button > button:active { filter: brightness(.92); box-shadow: var(--rc-elevation-1); }
rc-floating-button > button:focus-visible { outline: 3px solid var(--rc-focus); outline-offset: 2px; }
rc-floating-button > button:disabled { filter: grayscale(1) opacity(.55); box-shadow: none; cursor: not-allowed; }
rc-floating-button > button > span:empty { display: none; }
@media print { rc-floating-bar { display: none; } }
`, {layer: 'ricochet'})

/**
 * The component of `<rc-floating-button>`: a round icon button.
 * @attr {string} icon - Name of the icon.
 * @attr {number} [size=33] - Size of the icon, in pixels.
 * @attr {string} [title] - Tooltip; names the button.
 * @attr {string} [key] - Key that clicks the button (`Ctrl-ArrowLeft`…).
 * @attr {boolean} [disabled] - The button cannot be clicked.
 * @attr {string} [data-*] - Actions run by a click (see the `actions` module).
 */
export class RcFloatingButton extends RcIconButton {
  static observedAttributes = ['icon', 'size', 'label', 'title', 'disabled', 'key']

  sizeChanged (size) { super.sizeChanged(size ?? '33') }

  keyChanged (key) {
    if (key === null) {
      this.elButton.removeAttribute('aria-keyshortcuts')
    } else {
      this.elButton.setAttribute('aria-keyshortcuts', key.replaceAll('-', '+'))
    }
  }
}

let groups = 0

/**
 * The component of `<rc-floating-group>`: floating buttons side by side, with their keys and their colours.
 * @attr {string} [name] - Name of the group of floating keys (see the `keyboard` module); default: a name of its own.
 * @attr {string} [side=left] - `left` or `right`: the side of the line.
 * @attr {string} [gradient] - `right`: each button darker than the one on its left; `left`: than the one on its right.
 */
export class RcFloatingGroup extends WComponent {
  static display = 'flex'

  attach () {
    this.name = this.element.getAttribute('name') ?? `rc-floating-${++groups}`
    // the buttons added or removed, hidden or shown, enabled or disabled, a key or a gradient changed
    this.mutationObserver = new MutationObserver(() => this.#update())
    this.mutationObserver.observe(this.element, {childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'disabled', 'key', 'gradient']})
    this.#update()
  }

  detach () {
    this.mutationObserver?.disconnect()
    keyboard.setFloatingKeys(this.name, [])
  }

  // the rank of each button in the gradient, and the keys of the group
  #update () {
    const buttons = [...this.element.children].filter(child => child.localName === 'rc-floating-button' && !child.hidden)
    const gradient = this.element.getAttribute('gradient')
    buttons.forEach((button, i) => {
      const rank = gradient === 'right' ? i : gradient === 'left' ? buttons.length - 1 - i : 0
      button.style.setProperty('--rc-rank', `${rank}`)
    })
    const keys = buttons
      .filter(button => button.hasAttribute('key') && !button.hasAttribute('disabled'))
      .map(button => ({key: button.getAttribute('key'), action: {click: button.querySelector('button') ?? button}}))
    keyboard.setFloatingKeys(this.name, keys)
  }
}

/**
 * The component of `<rc-floating-bar>`: the line of the floating buttons, at the end of the view.
 * @listens {{open: number}} overlayChanged - The bar is hidden while a window is open.
 */
export class RcFloatingBar extends WComponent {
  static display = 'flex'

  attach () {
    this.listen('overlayChanged')
    this.overlayChangedDispatched({open: keyboard.layers})
  }

  overlayChangedDispatched ({open}) { this.element.style.visibility = open > 0 ? 'hidden' : '' }
}

WComponent.define('rc-floating-button', RcFloatingButton)
WComponent.define('rc-floating-group', RcFloatingGroup)
WComponent.define('rc-floating-bar', RcFloatingBar)
