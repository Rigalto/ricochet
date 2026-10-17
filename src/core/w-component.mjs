// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * `WComponent`: a controller bound to a DOM element. An element gets its component through its `as` attribute:
 * `<div as="like-button">` is mounted with the class registered by `WComponent.define('like-button', LikeButton)`.
 *
 * - **Mounting**: `WComponent.render(element)` mounts the element and every `[as]` element inside it; the kernel then
 *   calls `attach()`. `innerHTML(html)` replaces the content of the component and mounts what it holds.
 * - **Detaching**: when the element leaves the page, the kernel calls `detach()` if it exists, then releases every
 *   subscription, timer, animation loop, DOM listener and keyboard declaration of the component. An element moved
 *   elsewhere in the page keeps its component.
 * - **Attributes**: `observeAttributes(['icon', 'no-label'])` calls `iconChanged(newValue, oldValue)` and
 *   `noLabelChanged(…)` now and at each change.
 * - **Actions declared in HTML**: `clickDatasetHandler` reads `data-item`/`data-value`, `data-event`/`data-param`,
 *   `data-path`, `data-url` and `data-paste` on the clicked element and its parents.
 * - **Styles**: `WComponent.css(…)` adds CSS rules written next to the component (see the `css` module).
 *
 * @module w-component
 */

import {WController, setRenderer} from './w-controller.mjs'
import {$global} from './global.mjs'
import {keyboard} from './keyboard.mjs'
import {writeClipboard} from '../utils/dom.mjs'
import {css} from './css.mjs'

const leaks = $global.memoryLeak

// 'no-label' → 'noLabel'
const camelCase = name => name.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())

/**
 * Base class of components bound to a DOM element.
 */
export class WComponent extends WController {
  static tags = {}
  static detachObserver = null
  #attributeObserver = null
  #observedAttributes = new Map() // attribute → bound handler

  /**
   * Created by the kernel when the element is mounted; components do their setup in `attach()`.
   * @param {Element} element - The element of the component.
   */
  constructor (element) {
    super()
    this.element = element
    this.clickDatasetHandler = this.clickDatasetHandler.bind(this)
    this.doubleClickHandler = this.doubleClickHandler.bind(this)
    this._timerdoubleClick = null

    // one observer, for the whole page, detaches the components whose element leaves it
    if (WComponent.detachObserver === null) {
      WComponent.detachObserver = new MutationObserver(WComponent.#onRemoved)
      WComponent.detachObserver.observe(document.body, {childList: true, subtree: true})
    }
  }

  static #onRemoved (mutations) {
    for (const mutation of mutations) {
      for (const removed of mutation.removedNodes) {
        if (removed.nodeType !== Node.ELEMENT_NODE || removed.isConnected) { continue } // moved, not removed
        if (removed._component) { WComponent._detach(removed) }
        for (const inner of removed.querySelectorAll('[as]')) {
          if (inner._component) { WComponent._detach(inner) }
        }
      }
    }
  }

  /**
   * Registers the class of the components of a tag: elements with `as="<tag>"` are mounted with it.
   * @param {string} tag - Value of the `as` attribute.
   * @param {Function} component - Class extending `WComponent`.
   */
  static define (tag, component) {
    if (WComponent.tags[tag] !== undefined) {
      console.error(`WComponent.define: the tag '${tag}' is defined twice`)
      return
    }
    WComponent.tags[tag] = component
  }

  /**
   * Detaches the component of an element: `detach()`, then release of everything it subscribed to. Kernel internal.
   * @param {Element} element - Element whose component is detached.
   */
  static _detach (element) {
    const component = element._component
    if (component === undefined || component === null) { return }
    console.lifecycle('DETACH -', component.constructor.name, 'from', WComponent._elementName(element))
    leaks.attached -= 1
    // the kernel releases first, so that an error in detach() cannot leave a subscription behind
    component.release()
    component.unobserveAttributes()
    keyboard.release(component) // its module and view keys, unless another component replaced them; floating keys stay
    if (typeof component.detach === 'function') {
      try {
        component.detach()
      } catch (error) {
        console.error(`${component.constructor.name}.detach() failed`, error)
      }
    }
    component.element = null
    element._component = null
  }

  /**
   * Debugging: the tag name of an element followed by its classes (`div.styled-palette`).
   * @param {Element} element - The element.
   * @returns {string} The description.
   */
  static _elementName (element) {
    const name = element.className.length === 0 ? [] : String(element.className).split(' ')
    name.unshift(element.localName)
    return name.join('.')
  }

  // mounts the component of one element, if it has an 'as' attribute
  static _render (element) {
    const tag = element.getAttribute('as')
    if (tag === null) { return }
    const Component = WComponent.tags[tag]
    if (Component === undefined) {
      console.error(`WComponent.render: the tag '${tag}' is not defined`)
      return
    }
    if (element._component instanceof Component) { return }
    if (element._component) { WComponent._detach(element) } // another class: the former component is fully released
    const component = new Component(element)
    element._component = component
    if (typeof component.attach !== 'function') {
      console.error(`WComponent.render: the component '${tag}' has no attach() method`)
      return
    }
    console.lifecycle('ATTACH -', component.constructor.name, 'to', WComponent._elementName(element))
    leaks.attached += 1
    component.attach()
  }

  /**
   * Mounts the components of an element and of every `[as]` element inside it.
   * @param {Element} [element=document.body] - Root of the elements to mount. `<body>` itself must not have `as`.
   */
  static render (element = document.body) {
    if (element.tagName === 'BODY' && element.hasAttribute('as')) {
      console.error('WComponent.render: <body> must not have an "as" attribute')
      return
    }
    WComponent._render(element)
    for (const inner of element.querySelectorAll('[as]')) { WComponent._render(inner) }
  }

  /**
   * Replaces the content of the component, then mounts the components it holds.
   * @param {string} html - The new content.
   */
  innerHTML (html) {
    this.element.innerHTML = html
    WComponent.render(this.element)
  }

  // ------------------------------------------------------------------ styles

  /**
   * Adds CSS rules to the page, in a `<style>` element of their own. Same as `css()` of the `css` module.
   * @param {string} rules - Complete CSS rules, with their selectors and braces.
   * @param {{name: string, layer: string}} [options] - Name of the block and cascade layer (see `css()`).
   * @returns {HTMLStyleElement|null} The `<style>` element.
   */
  static css (rules, options) { return css(rules, options) }

  // ------------------------------------------------------------------ actions declared in HTML

  /**
   * Runs the actions declared by the `data-*` attributes of an element: `data-item` + `data-value` set a
   * configuration item, `data-event` (one or more names, separated by commas) + `data-param` (JSON) emit events,
   * `data-path` navigates, `data-url` opens a new tab, `data-paste` copies a text.
   * @param {DOMStringMap} dataset - The `dataset` of the element.
   */
  handleDataset (dataset) {
    const {item, value, event, param = '{}', path, url, paste} = dataset
    if (item !== undefined && item !== '') { this.setItem(item, `${value}`) }
    if (event !== undefined && event !== '') {
      for (const name of event.replaceAll(' ', '').split(',')) {
        const payload = JSON.parse(param)
        if (value !== undefined) { payload.value = value }
        this.emit(name, payload)
      }
    }
    if (path !== undefined && path !== '') { window.location.hash = path }
    if (url !== undefined && url !== '') { window.open(url, '_blank') }
    if (paste !== undefined && paste !== '') { writeClipboard(paste) }
  }

  /**
   * Click handler that runs the `data-*` actions of the clicked element and of its parents, up to the element that
   * listens, and calls their `notify(event, dataset)` method if they have one.
   * @param {MouseEvent} e - The click.
   */
  clickDatasetHandler (e) {
    e.stopPropagation()
    let tag = e.target
    while (tag !== null) {
      if (Object.keys(tag.dataset).length > 0) { this.handleDataset(tag.dataset) }
      if (typeof tag._component?.notify === 'function') { tag._component.notify(e, tag.dataset) }
      if (tag === e.currentTarget) { break }
      tag = tag.parentElement
    }
  }

  /**
   * Tells a single click from a double click: calls `singleClick(e)` 400 ms after a click, or `doubleClick(e)` if a
   * second click comes first.
   * @param {Event} e - The click.
   */
  doubleClickHandler (e) {
    if (this._timerdoubleClick !== null) {
      clearTimeout(this._timerdoubleClick)
      this._timerdoubleClick = null
      if (typeof this.doubleClick === 'function') { this.doubleClick(e) }
    } else {
      this._timerdoubleClick = setTimeout(() => {
        this._timerdoubleClick = null
        if (typeof this.singleClick === 'function') { this.singleClick(e) }
      }, 400)
    }
  }

  // ------------------------------------------------------------------ attributes

  /**
   * Observes attributes of the element: `<attribute>Changed(newValue, oldValue)` is called now, with the current
   * value, then at each change (`no-label` → `noLabelChanged`). Several calls add up.
   * @param {string|string[]} attributes - Attribute name, or an array of names.
   */
  observeAttributes (attributes) {
    if (attributes === undefined) {
      console.error(`${this.constructor.name}.observeAttributes: at least one attribute is expected`)
      return
    }
    const added = []
    for (const attribute of Array.isArray(attributes) ? attributes : [attributes]) {
      if (this.#observedAttributes.has(attribute)) { continue }
      const name = `${camelCase(attribute)}Changed`
      if (typeof this[name] !== 'function') {
        console.error(`${this.constructor.name}.observeAttributes: no method '${name}' for the attribute '${attribute}'`)
        continue
      }
      this.#observedAttributes.set(attribute, this[name].bind(this))
      added.push(attribute)
    }
    if (added.length === 0) { return }
    for (const attribute of added) {
      this.#observedAttributes.get(attribute)(this.element.getAttribute(attribute), null)
    }
    this.#attributeObserver?.disconnect()
    this.#attributeObserver = new MutationObserver(mutations => {
      if (this.element === null) { return }
      for (const {attributeName, oldValue} of mutations) {
        this.#observedAttributes.get(attributeName)?.(this.element.getAttribute(attributeName), oldValue)
      }
    })
    this.#attributeObserver.observe(this.element, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [...this.#observedAttributes.keys()],
    })
  }

  /** Stops observing the attributes of the element. */
  unobserveAttributes () {
    this.#attributeObserver?.disconnect()
    this.#attributeObserver = null
    this.#observedAttributes.clear()
  }

  // ------------------------------------------------------------------ keyboard

  /**
   * Declares the keys handled by the component in a keyboard layer (see the `keyboard` module). The keys of a
   * module or of the view are forgotten when the component is detached.
   * @param {string} layer - `modal`, `module`, `view`, or a group of floating buttons: `arrows`, `card`, `link`.
   * @param {*} keysOrName - The keys; for `module`, the module name.
   * @param {Array} [moduleKeys] - For `module`: the keys.
   */
  observeKeyboard (layer, keysOrName, moduleKeys) {
    switch (layer) {
      case 'modal':
        keyboard.setModalKeys(keysOrName)
        break
      case 'module':
        keyboard.setModuleKeys(keysOrName, moduleKeys, this)
        break
      case 'arrows':
      case 'card':
      case 'link':
        keyboard.setFloatingKeys(layer, keysOrName)
        break
      case 'view':
        keyboard.setViewKeys(keysOrName, this)
        break
      default:
        console.error(`${this.constructor.name}.observeKeyboard: unknown layer '${layer}'`)
    }
  }
}

setRenderer(WComponent.render)
