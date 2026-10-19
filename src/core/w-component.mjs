// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * `WComponent`: a controller bound to a DOM element. `WComponent.define('like-button', LikeButton)` registers the
 * class for two syntaxes, which may be mixed in the same page:
 *
 * - the **custom element** `<like-button>`, a native Custom Element in light DOM (no Shadow DOM): the browser mounts
 *   it as soon as it is in the page and its class is defined, even if the element was inserted before its module was
 *   loaded;
 * - the **attribute** `<div as="like-button">` (or `<span as="…">`), mounted by `WComponent.render()`: the former
 *   syntax, kept during the migration.
 *
 * In both cases `this.element` is the element, and the component does the same work.
 *
 * - **Mounting**: the kernel creates the component, then calls `attach()`. `WComponent.render(element)` mounts the
 *   `[as]` elements of a subtree; `innerHTML(html)` replaces the content of the component and mounts what it holds.
 *   Custom elements are mounted by the browser, but not before the first `WComponent.render()` (called by `start()`):
 *   those of the initial page wait until the configuration items and the route are ready.
 * - **Detaching**: when the element leaves the page, the kernel releases every subscription, timer, animation, task,
 *   DOM listener and keyboard declaration of the component, then calls `detach()` if it exists. An element moved
 *   elsewhere in the page keeps its component.
 * - **Attributes**: a class that declares `static observedAttributes = ['icon', 'no-label']` gets
 *   `iconChanged(newValue, oldValue)` and `noLabelChanged(…)` called after `attach()` with the current values, then at
 *   each change: through `attributeChangedCallback` for a custom element, through a mutation observer for an `[as]`
 *   element. `observeAttributes()` does the same from `attach()`.
 * - **Display**: a custom element is `inline` for the browser, like a `<span>`. The kernel gives each defined element
 *   `display: block`, like a `<div>`, in the `ricochet` cascade layer: the CSS of the application or of the component
 *   wins over it. A class may choose another value with `static display = 'inline'` (or `'flex'`, `'contents'`…).
 * - **Actions declared in HTML**: `clickDatasetHandler` reads `data-item`/`data-value`, `data-event`/`data-param`,
 *   `data-path`, `data-url` and `data-paste` on the clicked element and its parents.
 * - **Styles**: `WComponent.css(…)` adds CSS rules written next to the component (see the `css` module).
 *
 * @module w-component
 */

import {WController, setRenderer} from './w-controller.mjs'
import {$global} from './global.mjs'
import {keyboard} from './keyboard.mjs'
import {runActions} from './actions.mjs'
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
  static #open = false // custom elements are mounted once the application has called render() (start() does)
  static #waiting = [] // custom elements connected before that
  static #displayRules = [] // default display of the custom elements, one rule per tag
  static #displayStyle = null
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
   * Registers the class of the components of a tag: the custom element `<tag>` and the elements with `as="<tag>"`
   * are mounted with it. The tag must contain a `-` (`like-button`), as every custom element name.
   * @param {string} tag - Name of the custom element, and value of the `as` attribute.
   * @param {Function} component - Class extending `WComponent`.
   */
  static define (tag, component) {
    if (WComponent.tags[tag] !== undefined) {
      console.error(`WComponent.define: the tag '${tag}' is defined twice`)
      return
    }
    for (const attribute of component.observedAttributes ?? []) {
      const name = `${camelCase(attribute)}Changed`
      if (typeof component.prototype[name] !== 'function') {
        console.error(`WComponent.define: ${component.name} has no method '${name}' for the attribute '${attribute}'`)
      }
    }
    WComponent.tags[tag] = component
    if (typeof customElements === 'undefined') { return } // Node: tests
    if (customElements.get(tag) !== undefined) {
      console.error(`WComponent.define: the custom element '${tag}' is already defined elsewhere`)
      return
    }
    WComponent.#addDisplay(tag, component.display ?? 'block')
    customElements.define(tag, class extends HTMLElement {
      static observedAttributes = component.observedAttributes ?? []
      connectedCallback () { WComponent.#connected(this, component) }
      disconnectedCallback () { WComponent.#disconnected(this) }
      attributeChangedCallback (name, oldValue, newValue) {
        // the callbacks of the initial attributes come before connectedCallback: the component sends them after attach()
        if (this._component?._mounted === true) { this._component._attributeChanged(name, newValue, oldValue) }
      }
    })
  }

  // the default display of a custom element, in the 'ricochet' layer: any rule of the application wins over it
  static #addDisplay (tag, display) {
    if (display === 'inline') { return } // the default of the browser
    WComponent.#displayRules.push(`${tag} { display: ${display}; }`)
    if (WComponent.#displayStyle === null) {
      WComponent.#displayStyle = css('', {name: 'custom elements: default display', layer: 'ricochet'})
      // the rules are collected in one <style>, rewritten once per task
      WComponent.#displayStyle._pending = false
    }
    const style = WComponent.#displayStyle
    if (style === null || style._pending) { return }
    style._pending = true
    queueMicrotask(() => {
      style._pending = false
      style.textContent = `@layer ricochet {\n${WComponent.#displayRules.join('\n')}\n}`
    })
  }

  // a custom element enters the page: mounted, unless it only moved
  static #connected (element, Component) {
    element._disconnected = false
    if (element._component instanceof Component) { return } // moved: it keeps its component
    if (!WComponent.#open) {
      WComponent.#waiting.push([element, Component])
      return
    }
    WComponent.#mount(element, Component, element.localName)
  }

  // a custom element leaves the page: detached at the end of the task, unless it came back (moved)
  static #disconnected (element) {
    element._disconnected = true
    queueMicrotask(() => {
      if (element._disconnected && !element.isConnected) { WComponent._detach(element) }
    })
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
    component._mounted = false
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
    WComponent.#mount(element, Component, tag)
  }

  // creates the component of an element and attaches it
  static #mount (element, Component, tag) {
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
    component._mounted = true
    // the attributes declared by the class: current values now, then each change
    const attributes = Component.observedAttributes ?? []
    if (attributes.length === 0 || component.element === null) { return }
    if (element.localName === tag && typeof customElements !== 'undefined' && customElements.get(tag) !== undefined) {
      for (const attribute of attributes) { component._attributeChanged(attribute, element.getAttribute(attribute), null) }
    } else {
      component.observeAttributes(attributes)
    }
  }

  /**
   * Calls the method of an attribute (`no-label` → `noLabelChanged`). Kernel internal.
   * @param {string} attribute - Attribute name.
   * @param {string|null} newValue - New value.
   * @param {string|null} oldValue - Former value.
   */
  _attributeChanged (attribute, newValue, oldValue) {
    const name = `${camelCase(attribute)}Changed`
    if (typeof this[name] === 'function') { this[name](newValue, oldValue) }
  }

  /**
   * Mounts the components of an element and of every `[as]` element inside it. The first call also mounts the
   * custom elements already in the page: until then, they wait, so that the application decides when its interface
   * appears (`start()` calls it once the configuration items and the route are ready).
   * @param {Element} [element=document.body] - Root of the elements to mount. `<body>` itself must not have `as`.
   */
  static render (element = document.body) {
    if (element.tagName === 'BODY' && element.hasAttribute('as')) {
      console.error('WComponent.render: <body> must not have an "as" attribute')
      return
    }
    if (!WComponent.#open) {
      // the first render() opens the mounting: the custom elements already in the page are mounted now, in their order
      WComponent.#open = true
      for (const [waiting, Component] of WComponent.#waiting.splice(0)) {
        if (waiting.isConnected && !(waiting._component instanceof Component)) {
          WComponent.#mount(waiting, Component, waiting.localName)
        }
      }
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
  handleDataset (dataset) { runActions(dataset) }

  /**
   * Click handler that runs the `data-*` actions of the clicked element and of its parents, up to the element that
   * listens, and calls their `notify(event, dataset)` method if they have one. Components of the former API use it;
   * the click then stops there. The new components need no handler: see the `actions` module.
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
   * value, then at each change (`no-label` → `noLabelChanged`). With a method name, that method is called for every
   * attribute of the list, with `(newValue, oldValue, attribute)`: for attributes known only when the component runs.
   * Several calls add up.
   * @param {string|string[]} attributes - Attribute name, or an array of names.
   * @param {string} [handlerName] - Method called for all these attributes.
   */
  observeAttributes (attributes, handlerName) {
    if (attributes === undefined) {
      console.error(`${this.constructor.name}.observeAttributes: at least one attribute is expected`)
      return
    }
    const added = []
    for (const attribute of Array.isArray(attributes) ? attributes : [attributes]) {
      if (this.#observedAttributes.has(attribute)) { continue }
      const name = handlerName ?? `${camelCase(attribute)}Changed`
      if (typeof this[name] !== 'function') {
        console.error(`${this.constructor.name}.observeAttributes: no method '${name}' for the attribute '${attribute}'`)
        continue
      }
      const method = this[name].bind(this)
      this.#observedAttributes.set(attribute, handlerName === undefined ? method : (value, old) => method(value, old, attribute))
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
