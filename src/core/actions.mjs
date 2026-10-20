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
 * | `data-dblclick` + `data-param` | on a double click: emits one event, or several separated by commas, with the same payload as `data-event` |
 *
 * ```html
 * <rc-icon-button icon="save" data-event="noteSave" data-param='{"id": 12}'>Save</rc-icon-button>
 * ```
 *
 * ## Click and double click
 *
 * A double click is two clicks, then a `dblclick`. On an element with `data-dblclick`, the first click runs the
 * actions of the click at once, the second click is ignored (its `detail` is 2), and the `dblclick` emits the events of
 * `data-dblclick`. Nothing waits: the click is never delayed to see whether a second one comes.
 *
 * ```html
 * <tr data-event="tableRowSelected" data-dblclick="tableRowOpened" data-param='{"selected": "123"}'>…</tr>
 * ```
 *
 * A double click on that row selects it, then opens it. The action of the click must therefore make sense before
 * the one of the double click: to select, then to open. A component that toggles on a click should not toggle off
 * the selected row (a table selects a row on a click, and unselects it with Escape or a click elsewhere), or the
 * double click would unselect the row before opening it.
 *
 * The `dblclick` follows the rule of the click: it runs only if the nearest element with actions is the one with
 * `data-dblclick` (a double click on a checkbox inside the row does not open the row), and not if it is disabled.
 * On a touch screen, a double tap does not give a `dblclick` on every browser: give another way to do the same thing
 * (a button, the Enter key).
 *
 * ## Delegation
 *
 * One listener, on the document, handles every click: components do not listen to clicks to run their actions.
 *
 * - The **nearest** element that carries actions runs them, as a link would: going up from the clicked element, the
 *   first one with `data-item`, `data-event`, `data-path`, `data-url`, `data-paste`, `data-dialog` or `data-dblclick`. It may combine
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
 * The listeners (`click` and `dblclick`) are added when the module is imported.
 *
 * @module actions
 */

import {bus} from './bus.mjs'
import {itemStore} from './items.mjs'
import {writeClipboard} from '../utils/dom.mjs'

const ACTIONS = '[data-item], [data-event], [data-path], [data-url], [data-paste], [data-dialog], [data-dblclick]'
const DISABLED = '[disabled], [aria-disabled="true"]'

/**
 * Runs the actions of a `dataset`.
 * @param {DOMStringMap|object} dataset - The `dataset` of an element, or an object with the same keys.
 */
export function runActions (dataset) {
  const {item, value, event, param, path, url, paste, dialog} = dataset
  if (item !== undefined && item !== '') { itemStore().setItem(item, `${value}`) }
  if (event !== undefined && event !== '' && !emitEvents(event, param, value)) { return }
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

// emits the events of a comma separated list, with the payload of data-param; false if data-param is not JSON
const emitEvents = (events, param = '{}', value) => {
  let payload
  try {
    payload = JSON.parse(param)
  } catch (error) {
    console.error(`actions: data-param is not valid JSON for '${events}'`, param, error)
    return false
  }
  for (const name of events.replaceAll(' ', '').split(',')) {
    const copy = {...payload}
    if (value !== undefined) { copy.value = value }
    bus.emit(name, copy)
  }
  return true
}

/**
 * Runs the double click action of a `dataset`: emits the events of `data-dblclick`, with the payload of
 * `data-param` (and `data-value`).
 * @param {DOMStringMap|object} dataset - The `dataset` of an element, or an object with the same keys.
 */
export function runDoubleClickActions (dataset) {
  const {dblclick, param, value} = dataset
  if (dblclick !== undefined && dblclick !== '') { emitEvents(dblclick, param, value) }
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
  if (e.detail >= 2 && element.dataset.dblclick !== undefined) { return } // the second click of a double click
  runActions(element.dataset)
  const component = element._component
  if (typeof component?.notify === 'function') { component.notify(e, element.dataset) }
}

const onDoubleClick = e => {
  const element = actionElement(e.target)
  if (element === null || element.dataset.dblclick === undefined) { return }
  runDoubleClickActions(element.dataset)
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', onClick)
  document.addEventListener('dblclick', onDoubleClick)
}
