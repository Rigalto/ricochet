// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Tabs: `rc-tabs` holds `rc-tab` elements, each with the content of one tab. The tabs build the bar of their titles;
 * a click on a title shows its tab, then runs the actions of the `data-*` attributes of `rc-tabs` (see the `actions`
 * module), with the value of the tab in `data-value`.
 *
 * ```html
 * <rc-tabs data-item="sandbox-tab" value="map">
 *   <rc-tab value="map" label="Map" icon="map">…the map…</rc-tab>
 *   <rc-tab value="stats" label="Statistics" title="Counts of the last run">…the statistics…</rc-tab>
 *   <rc-tab value="log" label="Log" disabled>…</rc-tab>
 * </rc-tabs>
 * ```
 *
 * ## Tabs
 *
 * | Attribute of `rc-tab` | Role |
 * | --- | --- |
 * | `value` | value of the tab; default: its label |
 * | `label` | title in the bar |
 * | `icon` | icon before the title |
 * | `title` | tooltip of the title |
 * | `disabled` | the tab cannot be shown |
 *
 * A tab added, removed, or whose attributes change, changes the bar. The content of the tabs stays in the page: a tab
 * that is not shown is hidden (`hidden`), and its components keep their state. A tab whose content is heavy may be
 * filled when it is first shown: the application listens to the event of `rc-tabs`.
 *
 * ## Value
 *
 * The value is the `value` attribute of `rc-tabs`: the tab with that value is shown; when there is none, or it is
 * disabled, the first tab that is not disabled. The `value` property of the component (`element._component.value`)
 * reads and writes it. Changing the value by the attribute or by `value` runs no action; a click on the title of the tab
 * already shown runs nothing.
 *
 * | Use | How |
 * | --- | --- |
 * | A configuration item | `data-item="name"` on `rc-tabs`: the tab shown is kept in the item, and follows it. |
 * | An event | `data-event="name"` on `rc-tabs`, with `data-param`: emitted with `value` added to the payload. |
 *
 * ## Look
 *
 * The titles are flat buttons on a line; the title of the tab shown is underlined in `--rc-selected`. The palette of
 * the tabs is the palette of their block: `rc-tabs` may have its own `palette`, and a tab may be an `rc-panel`.
 *
 * ## Keyboard and screen readers
 *
 * The bar has `role="tablist"`, each title is a `<button role="tab">` with `aria-selected`, each tab has
 * `role="tabpanel"`. `Tab` reaches the title of the tab shown, then its content; `←` and `→` show the previous or the
 * next tab, `Home` and `End` the first or the last one, skipping the disabled ones.
 *
 * @module rc-tabs
 * @category ui
 */

import {css} from '../core/css.mjs'
import {isDisabled} from '../core/actions.mjs'
import {WComponent} from '../core/w-component.mjs'
import './rc-icon.mjs'

css(`
rc-tabs > [role="tablist"] {
  display: flex;
  flex-wrap: wrap;
  gap: .15em;
  margin-bottom: .5em;
  border-bottom: 1px solid var(--rc-border);
}
rc-tabs > [role="tablist"] > button {
  display: inline-flex;
  align-items: center;
  gap: .35em;
  margin: 0 0 -1px;
  padding: .4em .8em;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  background: transparent;
  color: var(--rc-text-muted);
  font: inherit;
  line-height: 1.2;
  cursor: pointer;
  transition: background-color .12s, color .12s;
}
@media (hover: hover) { rc-tabs > [role="tablist"] > button:hover { color: var(--rc-text); background: color-mix(in oklch, var(--rc-accent) 22%, transparent); } }
rc-tabs > [role="tablist"] > button[aria-selected="true"] {
  color: var(--rc-text-strong);
  border-bottom-color: var(--rc-selected);
  background: transparent;
  cursor: default;
}
rc-tabs > [role="tablist"] > button:focus-visible { outline: 2px solid var(--rc-focus); outline-offset: -2px; }
rc-tabs > [role="tablist"] > button:disabled { color: var(--rc-disabled); background: transparent; cursor: not-allowed; }
rc-tab[hidden] { display: none; }
`, {layer: 'ricochet'})

const KEYS = {ArrowRight: 1, ArrowLeft: -1}
let ids = 0

/**
 * The component of `<rc-tab>`: the content of one tab. Its attributes are read by `rc-tabs`.
 * @attr {string} [value] - Value of the tab; default: its label.
 * @attr {string} [label] - Title in the bar.
 * @attr {string} [icon] - Icon before the title.
 * @attr {string} [title] - Tooltip of the title.
 * @attr {boolean} [disabled] - The tab cannot be shown.
 */
export class RcTab extends WComponent {
  attach () { this.element.setAttribute('role', 'tabpanel') }
}

/**
 * The component of `<rc-tabs>`.
 * @attr {string} [value] - Value of the tab shown.
 * @attr {string} [data-item] - Configuration item that keeps the tab shown.
 * @attr {string} [data-*] - Other actions run when the user shows a tab (see the `actions` module).
 */
export class RcTabs extends WComponent {
  static observedAttributes = ['value']

  /** The value of the tab shown, `''` if there is no tab. */
  get value () { return this.element.dataset.value ?? '' }
  set value (value) { this.element.setAttribute('value', value) }

  attach () {
    this.elBar = document.createElement('div')
    this.elBar.setAttribute('role', 'tablist')
    this.element.prepend(this.elBar)
    this.changed = false
    this.observeDom(this.elBar, 'click', 'titleClicked')
    this.observeDom(this.elBar, 'keydown', 'titleKeyPressed')
    // the bar follows the tabs: added, removed, or their attributes changed
    this.mutationObserver = new MutationObserver(mutations => {
      const changed = m => m.type === 'childList'
        ? m.target === this.element
        : m.target.localName === 'rc-tab' && m.target.parentElement === this.element
      if (mutations.some(changed)) {
        this.#build()
      }
    })
    this.mutationObserver.observe(this.element, {childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'label', 'icon', 'title', 'disabled']})
    this.item = this.element.dataset.item
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
    this.#build()
  }

  detach () { this.mutationObserver?.disconnect() }

  valueChanged () { this.#select() }

  itemsChanged (items) {
    const value = items[this.item]
    if (value === undefined || value === null) { return } // not set yet: the tab shown stays
    this.element.setAttribute('value', value)
  }

  // the listener of the bar runs before the one of the document: the actions see the new value
  titleClicked (e) {
    this.changed = false
    const button = e.target.closest('[role="tab"]')
    if (button === null || button.disabled || isDisabled(button)) { return }
    if (button.dataset.value === this.value) { return }
    this.changed = true
    this.element.setAttribute('value', button.dataset.value)
  }

  /**
   * Called by the delegation of the actions: they run only if the click showed another tab.
   * @returns {boolean} True if the last click showed another tab.
   */
  acceptsClick () { return this.changed }

  // the arrows, Home and End show another tab, as a click would
  titleKeyPressed (e) {
    const buttons = [...this.elBar.children].filter(button => !button.disabled)
    const index = buttons.indexOf(e.target)
    if (index === -1 || buttons.length === 0) { return }
    let next
    if (e.code === 'Home') {
      next = 0
    } else if (e.code === 'End') {
      next = buttons.length - 1
    } else if (KEYS[e.code] !== undefined) {
      next = (index + KEYS[e.code] + buttons.length) % buttons.length
    } else {
      return
    }
    e.preventDefault()
    buttons[next].focus()
    buttons[next].click()
  }

  #tabs () { return [...this.element.children].filter(child => child.localName === 'rc-tab') }

  // one title per tab
  #build () {
    const buttons = this.#tabs().map(tab => {
      if (tab.id === '') { tab.id = `rc-tab-${++ids}` }
      const label = tab.getAttribute('label') ?? tab.getAttribute('value') ?? ''
      const button = document.createElement('button')
      button.type = 'button'
      button.id = `${tab.id}-title`
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-controls', tab.id)
      button.dataset.value = tab.getAttribute('value') ?? label
      button.disabled = tab.hasAttribute('disabled')
      if (tab.hasAttribute('title')) { button.title = tab.getAttribute('title') }
      const icon = tab.getAttribute('icon')
      if (icon !== null) {
        const elIcon = document.createElement('rc-icon')
        elIcon.setAttribute('icon', icon)
        elIcon.setAttribute('size', '18')
        button.append(elIcon)
      }
      button.append(label)
      tab.setAttribute('aria-labelledby', button.id)
      return button
    })
    this.elBar.replaceChildren(...buttons)
    this.#select()
  }

  // shows the tab of the value, or the first enabled one
  #select () {
    const wanted = this.element.getAttribute('value')
    const tabs = this.#tabs()
    const buttons = [...this.elBar.children]
    const enabled = tabs.filter(tab => !tab.hasAttribute('disabled'))
    const shown = enabled.find(tab => buttons[tabs.indexOf(tab)]?.dataset.value === wanted) ?? enabled[0] ?? null
    tabs.forEach((tab, i) => {
      const selected = tab === shown
      tab.hidden = !selected
      buttons[i]?.setAttribute('aria-selected', selected ? 'true' : 'false')
      if (buttons[i] !== undefined) { buttons[i].tabIndex = selected ? 0 : -1 }
    })
    this.element.dataset.value = shown === null ? '' : buttons[tabs.indexOf(shown)].dataset.value
  }
}

WComponent.define('rc-tab', RcTab)
WComponent.define('rc-tabs', RcTabs)
