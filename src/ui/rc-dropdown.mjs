// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A button that opens a window below it: a menu, a filter, a small form. The window shows above the whole page (the
 * top layer of the browser): no `overflow` cuts it, no `z-index` hides it.
 *
 * ```html
 * <rc-dropdown icon="filter" label="Filter" title="Filter the table">
 *   <rc-checkbox data-item="table-done">Done</rc-checkbox>
 *   <rc-text-button data-event="tableReset" data-close>Reset</rc-text-button>
 * </rc-dropdown>
 *
 * <rc-dropdown label="Columns" content="view-shared-columns-modal" content-attr='brick="lnk"'></rc-dropdown>
 * ```
 *
 * ## Button
 *
 * With `icon`, the button looks like an `rc-icon-button`; without, like an `rc-text-button`. `label` is its text
 * (`no-label`: none), `size` the size of the icon, `flat` removes its background; `title` is its tooltip. `icon`,
 * `label` and `title` may change later: the button follows (an icon that shows the choice made in the window).
 *
 * ## Content
 *
 * - **Written inside the element**: it stays in the page, hidden while the window is closed; its components keep their
 *   state.
 * - **A component named by `content`**: created when the window opens, with the attributes written in `content-attr`,
 *   and removed when it closes; it is new at each opening (its data are loaded again).
 *
 * ## Opening and closing
 *
 * A click on the button opens the window, a second click closes it. The window closes on a click outside it, on
 * `Escape`, on a click on an element with `data-close` inside it (after the actions of that element), and on the event
 * `dropdownClose` (`{}`: every open dropdown; `{id}`: the dropdown with that `id`). A dropdown inside the window of
 * another one opens above it; `Escape` closes the window on top only.
 *
 * While the window is open, it alone receives the keys (see the `keyboard` module), and the focus goes into it; it
 * comes back to the button when the window closes.
 *
 * ## Placement
 *
 * The window is placed below the button, aligned on its left side; when it does not fit in the browser window, it is
 * moved to the left, or shown above the button. Browsers that know CSS anchor positioning (Chrome 125, Safari 26,
 * Firefox 147) place it themselves; for the others, the component places it, and again when the window or the content
 * changes size or the page scrolls. `RcDropdown.anchorPositioning` tells which is used.
 *
 * ## Look
 *
 * The window stands on the surface of its block (`--rc-surface-raised`), with a border, rounded corners and the
 * shadow `--rc-elevation-3`; it keeps the palette of the dropdown.
 *
 * @module rc-dropdown
 * @category ui
 */

import {css} from '../core/css.mjs'
import {keyboard} from '../core/keyboard.mjs'
import {WComponent} from '../core/w-component.mjs'
import './rc-icon-button.mjs'
import './rc-text-button.mjs'

css(`
rc-dropdown > [popover] {
  inset: auto;
  margin: 0;
  box-sizing: border-box;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow: auto;
  padding: .5rem .75rem;
  border: 1px solid var(--rc-border);
  border-radius: 8px;
  background: var(--rc-surface-raised);
  color: var(--rc-text);
  box-shadow: var(--rc-elevation-3);
}
rc-dropdown > [popover].rc-anchored {
  position-area: bottom span-right;
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
  margin-block: 4px;
}
`, {layer: 'ricochet'})

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const GAP = 4 // between the button and the window
const EDGE = 8 // between the window and the edges of the browser window
let count = 0

/**
 * The component of `<rc-dropdown>`.
 * @attr {string} [icon] - Icon of the button; without it, the button is a text button. It may change later.
 * @attr {string} [label] - Text of the button; default: none.
 * @attr {boolean} [no-label] - No text on the button.
 * @attr {number} [size] - Size of the icon.
 * @attr {boolean} [flat] - The button has no background.
 * @attr {string} [title] - Tooltip of the button.
 * @attr {string} [content] - Tag of a component created in the window at each opening.
 * @attr {string} [content-attr] - Attributes of that component, as written in HTML.
 * @listens {{id: string}} dropdownClose - Closes the window: every dropdown, or the one with this `id`.
 */
export class RcDropdown extends WComponent {
  /** Whether the browser places the window itself (CSS anchor positioning); false: the component places it. */
  static anchorPositioning = typeof CSS !== 'undefined' && CSS.supports('anchor-name: --rc')

  static observedAttributes = ['label', 'title', 'icon']
  static display = 'inline-block'

  /** Whether the window is open. */
  get open () { return this.elWindow.matches(':popover-open') }

  attach () {
    const element = this.element
    this.number = ++count
    if (element.id === '') { element.id = `rc-dropdown-${this.number}` }
    /** The window. */
    this.elWindow = document.createElement('div')
    this.elWindow.setAttribute('popover', 'manual')
    this.elWindow.id = `${element.id}-window`
    this.elWindow.title = '' // the tooltip of the dropdown is the tooltip of its button only
    this.elWindow.append(...element.childNodes) // the content written in the element
    // the button
    const icon = element.getAttribute('icon')
    this.elTrigger = document.createElement(icon === null ? 'rc-text-button' : 'rc-icon-button')
    for (const attribute of ['icon', 'size', 'flat']) {
      if (element.hasAttribute(attribute)) { this.elTrigger.setAttribute(attribute, element.getAttribute(attribute)) }
    }
    element.replaceChildren(this.elTrigger, this.elWindow)
    this.anchored = RcDropdown.anchorPositioning
    if (this.anchored) {
      this.elTrigger.style.setProperty('anchor-name', `--rc-dropdown-${this.number}`)
      this.elWindow.style.setProperty('position-anchor', `--rc-dropdown-${this.number}`)
      this.elWindow.classList.add('rc-anchored')
    }
    this.observeDom(this.elTrigger, 'click', 'triggerClicked')
    this.listen('dropdownClose')
    this.#aria()
  }

  labelChanged (label) {
    const text = this.element.hasAttribute('no-label') ? null : label
    if (this.elTrigger.localName === 'rc-icon-button') {
      if (text === null) { this.elTrigger.removeAttribute('label') } else { this.elTrigger.setAttribute('label', text) }
    } else {
      this.elTrigger.setAttribute('label', text ?? '')
    }
  }

  iconChanged (icon) {
    // the icon may change later (it shows a state); a dropdown created without icon keeps its text button
    if (icon !== null && this.elTrigger.localName === 'rc-icon-button') { this.elTrigger.setAttribute('icon', icon) }
  }

  titleChanged (title) {
    if (title === null) { this.elTrigger.removeAttribute('title') } else { this.elTrigger.setAttribute('title', title) }
  }

  // ------------------------------------------------------------------ events

  triggerClicked (e) {
    if (e.target.closest('button')?.disabled) { return }
    if (this.open) { this.close() } else { this.show() }
  }

  /**
   * The event `dropdownClose`: closes the window, unless it names another dropdown.
   * @param {{id: string}} [payload] - `id` of the dropdown to close; none: every dropdown.
   */
  dropdownCloseDispatched (payload) {
    if (payload?.id === undefined || payload.id === this.element.id) { this.close() }
  }

  // a press outside the window and outside the button closes it
  pointerPressed (e) {
    if (!this.element.contains(e.target)) { this.close() }
  }

  // after the actions of the clicked element (the listener of the actions comes first)
  documentClicked (e) {
    if (this.elWindow.contains(e.target) && e.target.closest('[data-close]') !== null) { this.close() }
  }

  placementChanged () { this.#place() }

  // ------------------------------------------------------------------ opening and closing

  /** Opens the window. */
  show () {
    if (this.open || this.element === null) { return }
    const content = this.element.getAttribute('content')
    if (content !== null && content !== '') {
      this.elWindow.innerHTML = `<${content} ${this.element.getAttribute('content-attr') ?? ''}></${content}>`
      WComponent.render(this.elWindow)
    }
    this.elWindow.showPopover()
    keyboard.openLayer(this, [{key: 'Escape', action: {event: 'dropdownClose', param: {id: this.element.id}}}])
    this.observeDom(document, 'pointerdown', 'pointerPressed', {capture: true})
    this.observeDom(document, 'click', 'documentClicked')
    if (!this.anchored) {
      this.resizeObserver = new ResizeObserver(() => this.#place())
      this.resizeObserver.observe(this.elWindow)
      this.observeDom(window, 'resize', 'placementChanged')
      this.observeDom(document, 'scroll', 'placementChanged', {capture: true, passive: true})
      this.#place()
    }
    this.#aria()
    const first = this.elWindow.querySelector(FOCUSABLE)
    if (first !== null) {
      first.focus()
    } else {
      this.elWindow.tabIndex = -1
      this.elWindow.focus()
    }
  }

  /** Closes the window. */
  close () {
    if (!this.open) { return }
    const focusInside = this.elWindow.contains(document.activeElement)
    this.elWindow.hidePopover()
    keyboard.closeLayer(this)
    this.unobserveDom(document, 'pointerdown', 'pointerPressed')
    this.unobserveDom(document, 'click', 'documentClicked')
    if (!this.anchored) {
      this.resizeObserver?.disconnect()
      this.unobserveDom(window, 'resize', 'placementChanged')
      this.unobserveDom(document, 'scroll', 'placementChanged')
    }
    if (this.element.hasAttribute('content')) { this.elWindow.replaceChildren() }
    this.#aria()
    if (focusInside) { this.elTrigger.querySelector('button')?.focus() }
  }

  detach () { this.resizeObserver?.disconnect() }

  // ------------------------------------------------------------------ internals

  #aria () {
    const button = this.elTrigger.querySelector('button')
    if (button === null) { return } // the button is not mounted yet: done when it opens
    button.setAttribute('aria-haspopup', 'true')
    button.setAttribute('aria-controls', this.elWindow.id)
    button.setAttribute('aria-expanded', this.open ? 'true' : 'false')
  }

  // below the button, aligned on its left side; moved to the left, or above, to stay in the browser window
  #place () {
    if (!this.open) { return }
    const button = this.elTrigger.getBoundingClientRect()
    const width = this.elWindow.offsetWidth
    const height = this.elWindow.offsetHeight
    const right = window.innerWidth - EDGE
    const bottom = window.innerHeight - EDGE
    let left = button.left
    if (left + width > right) { left = Math.max(EDGE, right - width) }
    let top = button.bottom + GAP
    if (top + height > bottom) {
      top = button.top - GAP - height >= EDGE ? button.top - GAP - height : Math.max(EDGE, bottom - height)
    }
    this.elWindow.style.left = `${Math.round(left)}px`
    this.elWindow.style.top = `${Math.round(top)}px`
  }
}
WComponent.define('rc-dropdown', RcDropdown)
