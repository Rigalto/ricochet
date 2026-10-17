// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The synchronous event bus: every event of Ricochet goes through it, whether it is emitted now, deferred as a
 * microtask or scheduled for later (see `docs/DESIGN.md`, principles 1 to 3).
 *
 * `emit()` calls the listeners of the event at once, in the order they subscribed, and returns when they are all
 * done. Emitting allocates nothing: each event keeps an array of listeners that is replaced, never modified, when a
 * listener subscribes or unsubscribes. A consequence worth knowing: a listener added during an `emit()` is not called
 * by that `emit()`, and a listener removed during an `emit()` is still called by it.
 *
 * Components do not use this module directly: they subscribe by naming a method (`listen()` in `WController`), and
 * the kernel binds it and calls `on()`. Only kernel code passes functions to the bus.
 *
 * ```js
 * import {bus} from 'ricochet/core/bus.mjs'
 *
 * bus.on('tableRowSelected', onRowSelected)
 * bus.emit('tableRowSelected', {selected: '42'})
 * ```
 *
 * @module bus
 */

const EVENT_NAME = /^[a-z][A-Za-z0-9]*$/
const MAX_DEPTH = 64 // nested emits beyond this depth are a loop between listeners

/**
 * A synchronous event bus. The kernel uses the shared instance `bus`; tests create their own.
 */
export class EventBus {
  #listeners = new Map() // event name → array of functions, replaced on every change (copy on write)
  #tracer = null
  #depth = 0

  /**
   * Subscribes a function to an event. Subscribing the same function twice to the same event has no effect.
   * @param {string} name - Event name, in camelCase.
   * @param {Function} fn - Called with the payload of the event.
   */
  on (name, fn) {
    if (typeof fn !== 'function') { throw new TypeError(`EventBus.on: the listener of '${name}' is not a function`) }
    if (!EVENT_NAME.test(name)) { console.warn(`EventBus.on: '${name}' is not a camelCase event name`) }
    const list = this.#listeners.get(name)
    if (list === undefined) {
      this.#listeners.set(name, [fn])
    } else if (!list.includes(fn)) {
      this.#listeners.set(name, [...list, fn])
    }
  }

  /**
   * Unsubscribes a function from an event. Does nothing if it was not subscribed.
   * @param {string} name - Event name.
   * @param {Function} fn - The function given to `on()`.
   */
  off (name, fn) {
    const list = this.#listeners.get(name)
    if (list === undefined) { return }
    const index = list.indexOf(fn)
    if (index === -1) { return }
    if (list.length === 1) {
      this.#listeners.delete(name)
    } else {
      // copy without the function: an emit in progress keeps iterating over the former array
      const copy = list.slice()
      copy.splice(index, 1)
      this.#listeners.set(name, copy)
    }
  }

  /**
   * Calls every listener of an event, at once, in subscription order. An error thrown by a listener is reported in
   * the console and does not stop the other listeners.
   * @param {string} name - Event name.
   * @param {*} [payload] - Data given to the listeners. It is shared by all of them: they must not modify it.
   * @returns {number} The number of listeners called.
   */
  emit (name, payload) {
    const list = this.#listeners.get(name)
    if (this.#tracer !== null) { this.#tracer(name, payload, list === undefined ? 0 : list.length) }
    if (list === undefined) { return 0 }
    if (this.#depth >= MAX_DEPTH) {
      console.error(`EventBus.emit: '${name}' emitted at depth ${MAX_DEPTH}, probably a loop between listeners`)
      return 0
    }
    this.#depth += 1
    try {
      for (let i = 0; i < list.length; i++) {
        try {
          list[i](payload)
        } catch (error) {
          console.error(`EventBus.emit: listener '${list[i].name || '(anonymous)'}' of '${name}' failed`, error)
        }
      }
    } finally {
      this.#depth -= 1
    }
    return list.length
  }

  /**
   * Tells whether an event has listeners.
   * @param {string} name - Event name.
   * @returns {boolean} `true` if at least one function is subscribed.
   */
  has (name) { return this.#listeners.has(name) }

  /**
   * Number of listeners of an event.
   * @param {string} name - Event name.
   * @returns {number} The number of subscribed functions.
   */
  count (name) { return this.#listeners.get(name)?.length ?? 0 }

  /**
   * Debugging: the events that have listeners, with the names of the listeners, sorted by event name.
   * @returns {Array<{name: string, listeners: string[]}>} One entry per event.
   */
  stats () {
    return [...this.#listeners.keys()].sort().map(name => ({
      name,
      listeners: this.#listeners.get(name).map(fn => fn.name || '(anonymous)'),
    }))
  }

  /**
   * Debugging: registers a function called before each `emit()`, with the event name, the payload and the number of
   * listeners. `null` removes it. When no tracer is set, emitting costs nothing more.
   * @param {Function|null} fn - Called as `fn(name, payload, listenerCount)`.
   */
  setTracer (fn) { this.#tracer = fn }

  /** Removes every listener. For tests and for a full restart of the application. */
  clear () { this.#listeners.clear() }
}

/** The bus shared by the whole application. */
export const bus = new EventBus()
