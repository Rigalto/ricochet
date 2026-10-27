// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A breadcrumb: `rc-breadcrumb` holds `rc-crumb` elements, each a step of the path, shown on one line with a
 * separator between them. A crumb with `data-*` actions is a button (see the `actions` module): a click goes back to
 * that step.
 *
 * ```html
 * <rc-breadcrumb>
 *   <rc-crumb icon="home" label="Home" data-path="#hom/pln/table"></rc-crumb>
 *   <rc-crumb icon="book" prefix="1.2" label="The arrival" data-path="#rom/chp/table"></rc-crumb>
 *   <rc-crumb prefix="1.2.4" label="At the harbour"></rc-crumb>
 * </rc-breadcrumb>
 * ```
 *
 * ## Crumbs
 *
 * | Attribute of `rc-crumb` | Role |
 * | --- | --- |
 * | `icon` | icon before the text |
 * | `prefix` | short text before the label, always shown: a number (`1.2.4`), an id (`[12]`) |
 * | `label` | text of the step; hidden when the line is too short |
 * | `title` | tooltip; default, when the label is hidden: the label |
 * | `keep` | the label is never hidden |
 * | `disabled` | the button cannot be clicked |
 * | `data-*` | actions of a click; without them, the crumb is a text |
 *
 * Any other element may stand in the line, between the crumbs: an `rc-dropdown`, to choose among the steps of the same
 * level. It gets its separator; its text is never hidden.
 *
 * ## Short lines
 *
 * When the line is longer than its place, the labels are hidden one by one, from the first crumb towards the end,
 * until it fits; the icon and the prefix stay, and the hidden label becomes the tooltip. The label of the last crumb
 * (where the user is) is never hidden: it is cut with an ellipsis instead; nor the label of a crumb without icon nor
 * prefix, of which nothing would be left. The labels come back when the place grows. A crumb whose label is hidden has
 * the attribute `collapsed`.
 *
 * The line takes the width that its parent gives it: in a grid or a flex container, its cell must allow it to shrink
 * (`min-width: 0`).
 *
 * ## Look
 *
 * The crumbs that are buttons are flat buttons (see the `button-style` module); the prefix has the colour of the
 * label, with digits of equal width. The separator is `›`, in `--rc-text-faint`, or the text of the `separator`
 * attribute of `rc-breadcrumb`.
 *
 * ## Keyboard and screen readers
 *
 * `rc-breadcrumb` is a `navigation` named by its `label` attribute (default: `Breadcrumb`); the last crumb has
 * `aria-current="page"`. The crumbs that are buttons take the focus with `Tab`.
 *
 * @module rc-breadcrumb
 * @category ui
 */

import {css} from '../core/css.mjs'
import {actionElement} from '../core/actions.mjs'
import {WComponent} from '../core/w-component.mjs'
import './rc-icon.mjs'
import './rc-text-button.mjs'

css(`
rc-breadcrumb {
  align-items: center;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
rc-breadcrumb > * { flex: none; }
rc-breadcrumb > * + *::before {
  content: var(--rc-breadcrumb-separator, '›');
  padding: 0 .3em;
  color: var(--rc-text-faint);
  pointer-events: none;
}
rc-crumb { display: inline-flex; align-items: center; min-width: 0; pointer-events: none; }
rc-crumb > * { pointer-events: auto; min-width: 0; }
rc-crumb > rc-text-button > button, rc-crumb > .rc-crumb-text {
  display: inline-flex;
  align-items: center;
  gap: .35em;
  max-width: 100%;
  box-sizing: border-box;
}
rc-crumb > .rc-crumb-text { padding: .2em .3em; border: 1px solid transparent; line-height: 1.2; }
rc-crumb .rc-crumb-prefix { font-variant-numeric: tabular-nums; }
rc-crumb .rc-crumb-label { overflow: hidden; text-overflow: ellipsis; }
rc-crumb[collapsed] .rc-crumb-label, rc-crumb .rc-crumb-label:empty { display: none; }
rc-breadcrumb:not([rc-measuring]) > rc-crumb:last-child { flex: 0 1 auto; }
`, {layer: 'ricochet'})

/**
 * The component of `<rc-crumb>`: a step of a breadcrumb.
 * @attr {string} [icon] - Icon before the text.
 * @attr {string} [prefix] - Short text before the label, always shown.
 * @attr {string} [label] - Text of the step, hidden when the line is too short.
 * @attr {string} [title] - Tooltip; default, when the label is hidden: the label.
 * @attr {boolean} [keep] - The label is never hidden.
 * @attr {boolean} [disabled] - The button cannot be clicked.
 * @attr {boolean} [collapsed] - Set by `rc-breadcrumb`: the label is hidden.
 * @attr {string} [data-*] - Actions run by a click (see the `actions` module); without them, the crumb is a text.
 */
export class RcCrumb extends WComponent {
  static observedAttributes = ['icon', 'prefix', 'label', 'title', 'disabled', 'collapsed']
  static display = 'inline-flex'

  attach () {
    this.elIcon = document.createElement('rc-icon')
    this.elIcon.setAttribute('size', '18')
    this.elPrefix = document.createElement('span')
    this.elPrefix.className = 'rc-crumb-prefix'
    this.elLabel = document.createElement('span')
    this.elLabel.className = 'rc-crumb-label'
    // a button when a click has something to do, otherwise a text
    this.clickable = actionElement(this.element) === this.element
    if (this.clickable) {
      this.elBody = document.createElement('rc-text-button')
      this.elBody.setAttribute('flat', '')
    } else {
      this.elBody = document.createElement('span')
      this.elBody.className = 'rc-crumb-text'
    }
    this.elBody.append(this.elIcon, this.elPrefix, this.elLabel)
    this.element.replaceChildren(this.elBody)
  }

  iconChanged (icon) {
    if (icon === null || icon === '') {
      this.elIcon.remove()
    } else {
      this.elIcon.setAttribute('icon', icon)
      if (!this.elIcon.isConnected) { this.#body().prepend(this.elIcon) }
    }
  }

  prefixChanged (prefix) {
    this.elPrefix.textContent = prefix ?? ''
    this.elPrefix.hidden = prefix === null || prefix === ''
  }

  labelChanged (label) {
    this.elLabel.textContent = label ?? ''
    this.#tooltip()
  }

  titleChanged () { this.#tooltip() }

  collapsedChanged () { this.#tooltip() }

  disabledChanged (disabled) {
    if (!this.clickable) { return }
    if (disabled === null) { this.elBody.removeAttribute('disabled') } else { this.elBody.setAttribute('disabled', '') }
  }

  // the element that holds the icon, the prefix and the label: the <button> once rc-text-button is mounted
  #body () { return this.elBody.querySelector(':scope > button') ?? this.elBody }

  // the title of the crumb, or its label when the label is hidden; the name of the button for screen readers
  #tooltip () {
    const element = this.element
    const label = element.getAttribute('label') ?? ''
    const title = element.getAttribute('title')
    const collapsed = element.hasAttribute('collapsed')
    const tooltip = title ?? (collapsed && label !== '' ? label : null)
    if (tooltip === null) { this.elBody.removeAttribute('title') } else { this.elBody.setAttribute('title', tooltip) }
    const named = this.elBody.querySelector(':scope > button') ?? this.elBody
    if (collapsed && label !== '') { named.setAttribute('aria-label', label) } else { named.removeAttribute('aria-label') }
  }
}

/**
 * The component of `<rc-breadcrumb>`.
 * @attr {string} [separator] - Text between two crumbs; default: `›`.
 * @attr {string} [label] - Name of the navigation for screen readers; default: `Breadcrumb`.
 */
export class RcBreadcrumb extends WComponent {
  static observedAttributes = ['separator', 'label']
  static display = 'flex'

  attach () {
    this.element.setAttribute('role', 'navigation')
    // the line is fitted again when its width changes, and when the crumbs change
    this.resizeObserver = new ResizeObserver(() => this.fit())
    this.resizeObserver.observe(this.element)
    this.mutationObserver = new MutationObserver(mutations => {
      const changed = m => m.type === 'childList'
        ? m.target === this.element
        : m.target.localName === 'rc-crumb' && m.target.parentElement === this.element
      if (mutations.some(changed)) { this.fit() }
    })
    this.mutationObserver.observe(this.element, {childList: true, subtree: true, attributes: true,
      attributeFilter: ['icon', 'prefix', 'label', 'keep']})
    this.fit()
  }

  detach () {
    this.resizeObserver?.disconnect()
    this.mutationObserver?.disconnect()
  }

  separatorChanged (separator) {
    if (separator === null) {
      this.element.style.removeProperty('--rc-breadcrumb-separator')
    } else {
      this.element.style.setProperty('--rc-breadcrumb-separator', JSON.stringify(separator))
    }
  }

  labelChanged (label) { this.element.setAttribute('aria-label', label ?? 'Breadcrumb') }

  /**
   * Shows every label, then hides them one by one, from the first crumb, until the line fits in its width. Called by
   * the component when the width or the crumbs change; an application calls it after a change that the component
   * cannot see (a font loaded later).
   */
  fit () {
    const element = this.element
    if (element === null || !element.isConnected) { return }
    const children = [...element.children]
    const crumbs = children.filter(child => child.localName === 'rc-crumb')
    children.forEach((child, i) => {
      if (i === children.length - 1) { child.setAttribute('aria-current', 'page') } else { child.removeAttribute('aria-current') }
    })
    for (const crumb of crumbs) { crumb.removeAttribute('collapsed') }
    if (element.clientWidth === 0) { return } // not displayed: nothing to measure
    const last = children.at(-1)
    const has = (crumb, attribute) => (crumb.getAttribute(attribute) ?? '') !== ''
    // a crumb keeps its label when nothing would be left of it: no icon and no prefix
    const candidates = crumbs.filter(crumb => crumb !== last && !crumb.hasAttribute('keep') && has(crumb, 'label') &&
      (has(crumb, 'icon') || has(crumb, 'prefix')))
    // measured without the shrinking of the last crumb, which would hide the overflow
    element.setAttribute('rc-measuring', '')
    const overflows = () => element.scrollWidth > element.clientWidth
    for (const crumb of candidates) {
      if (!overflows()) { break }
      crumb.setAttribute('collapsed', '')
    }
    element.removeAttribute('rc-measuring')
  }
}

WComponent.define('rc-crumb', RcCrumb)
WComponent.define('rc-breadcrumb', RcBreadcrumb)
