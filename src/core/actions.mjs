// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Actions declared in HTML: a click on an element runs the actions written in its `data-*` attributes, without any
 * JavaScript in the component.
 *
 * | Attributes | Action |
 * | --- | --- |
 * | `data-item` + `data-value` | sets a configuration item |
 * | `data-event` + `data-param` | emits one event, or several separated by commas; `data-param` is the JSON payload, `data-value` is added to it as `value` |
 * | `data-path` | navigates: `#universe/brick/…` |
 * | `data-url` | opens a new tab |
 * | `data-paste` | copies a text to the clipboard |
 * | `data-dialog` | opens the `rc-dialog` with this `id` |
 *
 * ```html
 * <rc-icon-button icon="save" data-event="noteSave" data-param='{"id": 12}'>Save</rc-icon-button>
 * ```
 *
 * ## Delegation
 *
 * One listener, on the document, handles every click: components do not listen to clicks to run their actions.
 *
 * - The **nearest** element that carries actions runs them, as a link would: going up from the clicked element, the
 *   first one with `data-item`, `data-event`, `data-path`, `data-url`, `data-paste` or `data-dialog`. It may combine
 *   several actions; the elements with actions above it do not run theirs.
 * - Nothing runs if the clicked element, or any element around it, has the `disabled` attribute or
 *   `aria-disabled="true"`: a disabled block disables everything inside.
 * - A component whose `data-*` attributes are not meant for clicks (an input that sets its item when it changes)
 *   declares `static clickActions = false`.
 * - A component may refuse one click: if it has an `acceptsClick(target)` method that returns `false`, nothing runs
 *   (a radio group, when the radio clicked is already the selected one).
 * - If the component of the element has a `notify(event, dataset)` method, it is called after the actions.
 * - A component that changes its state on a click (a checkbox) does it in its own click listener: it runs before the
 *   listener of the document, so that the actions see the new state (`data-value`).
 * - The click goes on: the listeners of the components still receive it.
 *
 * **Migration.** The elements mounted with the former syntax (`as="…"`), and the plain elements inside them, keep the
 * former behaviour: their clicks are left to their own handlers (`clickDatasetHandler`). A custom element inside them,
 * such as an `rc-icon-button`, runs its actions.
 *
 * The listener is added when the module is imported.
 *
 * @module actions
 */

import {bus} from './bus.mjs'
import {itemStore} from './items.mjs'
import {writeClipboard} from '../utils/dom.mjs'

const ACTIONS = '[data-item], [data-event], [data-path], [data-url], [data-paste], [data-dialog]'
const DISABLED = '[disabled], [aria-disabled="true"]'

/**
 * Runs the actions of a `dataset`.
 * @param {DOMStringMap|object} dataset - The `dataset` of an element, or an object with the same keys.
 */
export function runActions (dataset) {
  const {item, value, event, param = '{}', path, url, paste, dialog} = dataset
  if (item !== undefined && item !== '') { itemStore().setItem(item, `${value}`) }
  if (event !== undefined && event !== '') {
    let payload
    try {
      payload = JSON.parse(param)
    } catch (error) {
      console.error(`actions: data-param is not valid JSON for '${event}'`, param, error)
      return
    }
    for (const name of event.replaceAll(' ', '').split(',')) {
      const copy = {...payload}
      if (value !== undefined) { copy.value = value }
      bus.emit(name, copy)
    }
  }
  if (path !== undefined && path !== '') { globalThis.location.hash = path }
  if (url !== undefined && url !== '') { window.open(url, '_blank') }
  if (paste !== undefined && paste !== '') { writeClipboard(paste) }
  if (dialog !== undefined && dialog !== '') {
    const element = document.getElementById(dialog)
    if (element?.localName === 'rc-dialog') {
      element.setAttribute('open', '')
    } else {
      console.error(`actions: data-dialog='${dialog}' is not the id of an rc-dialog`)
    }
  }
}

/**
 * Whether an element is disabled: it, or any element around it, has the `disabled` attribute or
 * `aria-disabled="true"`.
 * @param {Element} target - An element.
 * @returns {boolean} True if the element is disabled.
 */
export const isDisabled = target => target?.closest?.(DISABLED) != null

/**
 * The element whose actions a click runs, or `null`.
 * @param {Element} target - The clicked element.
 * @returns {Element|null} The nearest element with actions, unless it is disabled.
 */
export function actionElement (target) {
  const element = target?.closest?.(ACTIONS) ?? null
  if (element === null) { return null }
  if (isDisabled(target)) { return null } // disabled: the clicked element or any element around it
  // the element of a component, or the nearest component around a plain element
  let owner = element
  while (owner !== null && !owner._component) { owner = owner.parentElement }
  if (owner !== null) {
    if (owner.hasAttribute('as')) { return null } // the former syntax keeps its own click handlers
    if (owner === element) {
      const component = owner._component
      if (component.constructor.clickActions === false) { return null }
      if (typeof component.acceptsClick === 'function' && component.acceptsClick(target) === false) { return null }
    }
  }
  return element
}

const onClick = e => {
  const element = actionElement(e.target)
  if (element === null) { return }
  runActions(element.dataset)
  const component = element._component
  if (typeof component?.notify === 'function') { component.notify(e, element.dataset) }
}

if (typeof document !== 'undefined') { document.addEventListener('click', onClick) }
