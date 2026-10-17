/**
 * `WController`: the base class of everything that reacts to events without owning a DOM element (keyboard, data
 * proxies, business logic). `WComponent` extends it for components bound to an element.
 *
 * A controller subscribes to stimuli by **naming** one of its methods (principle 7 of `docs/DESIGN.md`): the kernel
 * binds the method once and keeps every subscription, so that `release()` — called automatically when a component is
 * detached — stops them all. Subscribing twice in the same way has no effect.
 *
 * | Stimulus | Subscribe | Default method |
 * | --- | --- | --- |
 * | event of the bus | `listen(name)` | `<name>Dispatched(payload)` |
 * | configuration items | `observeItems([items])` | `itemsChanged(items)` |
 * | window event | `observeWindowEvents(type, method)` | — |
 * | DOM event | `observeDom(target, type, method)` | — |
 * | interval | `setInterval(method, ms)` | — |
 * | animation frame | `setAnimationFrame(method)` | — |
 *
 * @module w-controller
 */

import {bus} from './bus.mjs'
import {$global} from './global.mjs'
import './debug.mjs'
import {itemStore} from './items.mjs'
import {keyboard} from './keyboard.mjs'

const leaks = $global.memoryLeak

// first use of a deprecated method, per class, when $global.debug.deprecated is true
const deprecatedSeen = new Set()
const warnDeprecated = (instance, oldName, newName) => {
  if (!$global.debug.deprecated) { return }
  const key = `${instance.constructor.name}.${oldName}`
  if (deprecatedSeen.has(key)) { return }
  deprecatedSeen.add(key)
  console.warn(`${key} is deprecated: use ${newName}`)
}

let renderer = null

/**
 * Kernel internal: registers the function that mounts components after an `innerHTML` (set by `w-component.mjs`).
 * @param {Function} fn - Called with the element whose content changed.
 */
export const setRenderer = fn => { renderer = fn }

/**
 * Base class of controllers. A controller is usually a singleton created when its module is imported.
 */
export class WController {
  #bound = new Map() // method name → method bound to the instance, bound once
  #listeners = new Map() // `${event}|${method}` → {event, listener}
  #items = new Map() // `${method}|${items}` → observation id in the item store
  #windowEvents = new Map() // `${type}|${method}` → {type, fn}
  #domEvents = [] // {target, type, name, fn, options}
  #intervals = new Map() // method name → interval id
  #frame = null // {name, fn, id} of the running animation loop

  // ------------------------------------------------------------------ named methods

  #method (name) {
    let bound = this.#bound.get(name)
    if (bound === undefined) {
      if (typeof this[name] !== 'function') { return null }
      bound = this[name].bind(this)
      this.#bound.set(name, bound)
    }
    return bound
  }

  #requireMethod (caller, name, what) {
    if (typeof name !== 'string') {
      console.error(`${this.constructor.name}.${caller}: a method name is expected for ${what}`)
      return null
    }
    const method = this.#method(name)
    if (method === null) { console.error(`${this.constructor.name}.${caller}: no method '${name}' for ${what}`) }
    return method
  }

  // ------------------------------------------------------------------ events of the bus

  #subscribe (caller, event, handlerName, legacy) {
    if (Array.isArray(event)) {
      for (const e of event) { this.#subscribe(caller, e, handlerName, legacy) }
      return
    }
    if (typeof event !== 'string') {
      console.error(`${this.constructor.name}.${caller}: an event name or an array of names is expected`, event)
      return
    }
    const name = handlerName ?? `${event}Dispatched`
    const key = `${event}|${name}`
    if (this.#listeners.has(key)) { return }
    const method = this.#requireMethod(caller, name, `the event '${event}'`)
    if (method === null) { return }
    // the former API received {type, detail}, like a CustomEvent; listen() receives the payload itself
    const listener = legacy ? payload => method({type: event, detail: payload ?? {}}) : method
    bus.on(event, listener)
    this.#listeners.set(key, {event, listener})
    leaks.eventHandlers += 1
  }

  #unsubscribe (caller, event, handlerName) {
    if (Array.isArray(event)) {
      for (const e of event) { this.#unsubscribe(caller, e, handlerName) }
      return
    }
    const key = `${event}|${handlerName ?? `${event}Dispatched`}`
    const entry = this.#listeners.get(key)
    if (entry === undefined) {
      console.warn(`${this.constructor.name}.${caller}: no subscription '${key}'`)
      return
    }
    bus.off(entry.event, entry.listener)
    this.#listeners.delete(key)
    leaks.eventHandlers -= 1
  }

  /**
   * Subscribes a method to an event of the bus, or to each event of an array. The method receives the payload.
   * @param {string|string[]} event - Event name (camelCase), or an array of names.
   * @param {string} [handlerName] - Method name. Default: `<event>Dispatched`.
   */
  listen (event, handlerName) { this.#subscribe('listen', event, handlerName, false) }

  /**
   * Unsubscribes a method from an event. Not needed before a component is detached: it is done automatically.
   * @param {string|string[]} event - Event name, or an array of names.
   * @param {string} [handlerName] - Method name. Default: `<event>Dispatched`.
   */
  unlisten (event, handlerName) { this.#unsubscribe('unlisten', event, handlerName) }

  /** Unsubscribes every method of the instance from the bus. */
  unlistenAll () {
    for (const {event, listener} of this.#listeners.values()) {
      bus.off(event, listener)
      leaks.eventHandlers -= 1
    }
    this.#listeners.clear()
  }

  /**
   * Emits an event on the bus: every subscriber is called at once.
   * @param {string} event - Event name.
   * @param {*} [payload] - Data given to the subscribers.
   */
  static emit (event, payload) { bus.emit(event, payload) }

  /**
   * Emits an event on the bus. See `WController.emit()`.
   * @param {string} event - Event name.
   * @param {*} [payload] - Data given to the subscribers.
   */
  emit (event, payload) { bus.emit(event, payload) }

  /**
   * @deprecated Use `listen()`: the method receives `{type, detail}` instead of the payload.
   */
  observeEvents (event, handlerName) {
    warnDeprecated(this, 'observeEvents', 'listen')
    this.#subscribe('observeEvents', event, handlerName, true)
  }

  /** @deprecated Use `unlisten()`. */
  unobserveEvents (event, handlerName) {
    warnDeprecated(this, 'unobserveEvents', 'unlisten')
    this.#unsubscribe('unobserveEvents', event, handlerName)
  }

  /** @deprecated Use `unlistenAll()`. */
  unobserveAllEvents () { this.unlistenAll() }

  /** @deprecated Use `WController.emit()`. */
  static dispatchEvent (event, detail = {}) { bus.emit(event, detail) }

  /** @deprecated Use `emit()`. */
  dispatchEvent (event, detail = {}) {
    warnDeprecated(this, 'dispatchEvent', 'emit')
    bus.emit(event, detail)
  }

  // ------------------------------------------------------------------ window events

  /**
   * Subscribes a method to an event of `window` (`resize`, `hashchange`…). It receives the DOM event.
   * @param {string} type - Event type.
   * @param {string} handlerName - Method name.
   */
  observeWindowEvents (type, handlerName) {
    const key = `${type}|${handlerName}`
    if (this.#windowEvents.has(key)) { return }
    const fn = this.#requireMethod('observeWindowEvents', handlerName, `the window event '${type}'`)
    if (fn === null) { return }
    window.addEventListener(type, fn)
    this.#windowEvents.set(key, {type, fn})
    leaks.windowEventHandlers += 1
  }

  /**
   * Unsubscribes a method from an event of `window`.
   * @param {string} type - Event type.
   * @param {string} handlerName - Method name.
   */
  unobserveWindowEvents (type, handlerName) {
    const key = `${type}|${handlerName}`
    const entry = this.#windowEvents.get(key)
    if (entry === undefined) {
      console.warn(`${this.constructor.name}.unobserveWindowEvents: no subscription '${key}'`)
      return
    }
    window.removeEventListener(entry.type, entry.fn)
    this.#windowEvents.delete(key)
    leaks.windowEventHandlers -= 1
  }

  /** Unsubscribes every method of the instance from the events of `window`. */
  unobserveAllWindowEvents () {
    for (const {type, fn} of this.#windowEvents.values()) {
      window.removeEventListener(type, fn)
      leaks.windowEventHandlers -= 1
    }
    this.#windowEvents.clear()
  }

  // ------------------------------------------------------------------ DOM events

  /**
   * Subscribes a method to an event of a DOM element (`click`, `input`…). It receives the DOM event. Unlike a bare
   * `addEventListener`, the subscription is removed when the component is detached.
   * @param {EventTarget} target - Element (or document) to listen to.
   * @param {string} type - Event type.
   * @param {string} handlerName - Method name.
   * @param {object} [options] - Options of `addEventListener` (`capture`, `passive`…).
   */
  observeDom (target, type, handlerName, options) {
    if (this.#domEvents.some(d => d.target === target && d.type === type && d.name === handlerName)) { return }
    const fn = this.#requireMethod('observeDom', handlerName, `the DOM event '${type}'`)
    if (fn === null) { return }
    target.addEventListener(type, fn, options)
    this.#domEvents.push({target, type, name: handlerName, fn, options})
    leaks.domEventHandlers += 1
  }

  /**
   * Unsubscribes a method from an event of a DOM element.
   * @param {EventTarget} target - The element given to `observeDom()`.
   * @param {string} type - Event type.
   * @param {string} handlerName - Method name.
   */
  unobserveDom (target, type, handlerName) {
    const index = this.#domEvents.findIndex(d => d.target === target && d.type === type && d.name === handlerName)
    if (index === -1) { return }
    const {fn, options} = this.#domEvents[index]
    target.removeEventListener(type, fn, options)
    this.#domEvents.splice(index, 1)
    leaks.domEventHandlers -= 1
  }

  /** Unsubscribes every method of the instance from DOM events. */
  unobserveAllDom () {
    for (const {target, type, fn, options} of this.#domEvents) {
      target.removeEventListener(type, fn, options)
      leaks.domEventHandlers -= 1
    }
    this.#domEvents.length = 0
  }

  // ------------------------------------------------------------------ configuration items

  /**
   * Observes configuration items: the method is called now with their current values, then whenever one of them
   * changes, with an object `{item: value, …}`. A `$` in an item name is replaced according to the current route.
   * @param {string|string[]} items - Item name, or an array of names.
   * @param {string} [handlerName=itemsChanged] - Method name.
   */
  observeItems (items, handlerName = 'itemsChanged') {
    const list = Array.isArray(items) ? items : [items]
    const key = `${handlerName}|${list.join(',')}`
    if (this.#items.has(key)) { return }
    const fn = this.#requireMethod('observeItems', handlerName, `the items '${list.join(', ')}'`)
    if (fn === null) { return }
    this.#items.set(key, itemStore().addObserver(list, fn))
    leaks.configObserver += 1
  }

  /** Stops every observation of configuration items made by the instance. */
  unobserveItems () {
    if (this.#items.size === 0) { return }
    const store = itemStore()
    for (const id of this.#items.values()) {
      store.removeObserver(id)
      leaks.configObserver -= 1
    }
    this.#items.clear()
  }

  /**
   * Changes a configuration item.
   * @param {string} item - Item name.
   * @param {string} value - New value.
   */
  static setItem (item, value) { itemStore().setItem(item, value) }

  /**
   * Changes a configuration item. See `WController.setItem()`.
   * @param {string} item - Item name.
   * @param {string} value - New value.
   */
  setItem (item, value) { itemStore().setItem(item, value) }

  /**
   * Changes several configuration items.
   * @param {Array<{item: string, value: string}>} items - The items and their new values.
   */
  static setItems (items) {
    if (!Array.isArray(items)) {
      console.error('WController.setItems: an array is expected')
      return
    }
    for (const {item, value} of items) { itemStore().setItem(item, value) }
  }

  /**
   * Changes several configuration items. See `WController.setItems()`.
   * @param {Array<{item: string, value: string}>} items - The items and their new values.
   */
  setItems (items) { WController.setItems(items) }

  /**
   * Changes a configuration item only if its current value is `expected`.
   * @param {string} item - Item name.
   * @param {string} expected - Value the item must have.
   * @param {string} value - New value.
   */
  static setItemIfValue (item, expected, value) { itemStore().setItemIfValue(item, expected, value) }

  // ------------------------------------------------------------------ timers

  /**
   * Calls a method at a regular interval, until `clearInterval()` or the detachment of the component. Calling it
   * again with the same method restarts the interval with the new delay.
   * @param {string} handlerName - Method name.
   * @param {number} delay - Interval in milliseconds.
   */
  setInterval (handlerName, delay) {
    const fn = this.#requireMethod('setInterval', handlerName, 'an interval')
    if (fn === null) { return }
    this.clearInterval(handlerName)
    this.#intervals.set(handlerName, setInterval(fn, delay))
    leaks.setInterval += 1
  }

  /**
   * Stops the interval of a method.
   * @param {string} handlerName - Method name.
   */
  clearInterval (handlerName) {
    const id = this.#intervals.get(handlerName)
    if (id === undefined) { return }
    clearInterval(id)
    this.#intervals.delete(handlerName)
    leaks.setInterval -= 1
  }

  /** Stops every interval of the instance. */
  clearAllIntervals () {
    for (const name of [...this.#intervals.keys()]) { this.clearInterval(name) }
  }

  /**
   * Calls a method at every display frame, with the frame timestamp, until `unsetAnimationFrame()` or the
   * detachment of the component. One loop per instance: naming another method replaces it, `null` stops it.
   * @param {string|null} handlerName - Method name, or `null` to stop.
   */
  setAnimationFrame (handlerName) {
    this.unsetAnimationFrame()
    if (handlerName === null || handlerName === undefined) { return }
    const fn = this.#requireMethod('setAnimationFrame', handlerName, 'the animation loop')
    if (fn === null) { return }
    const frame = {name: handlerName, fn, id: 0}
    const loop = time => {
      if (this.#frame !== frame) { return }
      frame.fn(time)
      if (this.#frame === frame) { frame.id = requestAnimationFrame(loop) }
    }
    this.#frame = frame
    frame.id = requestAnimationFrame(loop)
    leaks.animationframe += 1
  }

  /** Stops the animation loop of the instance. */
  unsetAnimationFrame () {
    if (this.#frame === null) { return }
    cancelAnimationFrame(this.#frame.id)
    this.#frame = null
    leaks.animationframe -= 1
  }

  // ------------------------------------------------------------------ keyboard and DOM

  /**
   * Physical codes of the keys held down (`KeyA`, `ShiftLeft`…).
   * @returns {Set<string>} The codes.
   */
  getKeyboard () { return keyboard.keyboard }

  /**
   * Characters of the keys held down.
   * @returns {Set<string>} The characters.
   */
  getKeys () { return keyboard.keys }

  /**
   * Replaces the content of an element, then mounts the components it holds.
   * @param {Element} element - The element.
   * @param {string} html - Its new content.
   */
  elementInnerHTML (element, html) {
    element.innerHTML = html
    renderer?.(element)
  }

  // ------------------------------------------------------------------ release

  /**
   * Stops every subscription, timer and animation loop of the instance. Called automatically when a component is
   * detached; a controller that is discarded must call it.
   */
  release () {
    this.unlistenAll()
    this.unobserveAllWindowEvents()
    this.unobserveAllDom()
    this.unobserveItems()
    this.clearAllIntervals()
    this.unsetAnimationFrame()
  }
}
