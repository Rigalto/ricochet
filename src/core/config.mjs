// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The store of configuration items: shared, persistent key/value pairs. One instance, `config`, serves the whole
 * application and registers itself as the item store of the kernel (see the `items` module) when this module is
 * imported.
 *
 * - **Storage.** The store does not know where the items live: an *adapter*, given by the application with
 *   `setAdapter()`, loads and saves them (an HTTP server, Google Drive, memory…).
 * - **Observers.** `addObserver(items, recall)` calls `recall({item: value, …})` once with the current values, then
 *   whenever one of the items changes. Calls are grouped: an observer is called once at the end of the current task,
 *   however many of its items changed.
 * - **Saving.** A change is applied at once in memory and saved 2 seconds later, together with the other changes of
 *   that time (a scheduled task, `configSave`). Pending changes are saved at once when the page is hidden or closed.
 *   When a save fails, the changes stay pending and are saved again 30 seconds later.
 * - **Scope.** In an item name, `$` stands for the current scope, set with `setScope()`: `table-$-sort` is
 *   `table-hom-not-sort` while the scope is `hom-not`. When the scope changes, only the observers whose values change
 *   are called.
 *
 * Every change is recorded in `$global.logs.items` and `$global.logs.timeline`.
 *
 * ## Adapters
 *
 * An adapter is an object with three asynchronous methods:
 *
 * | Method | Role |
 * | --- | --- |
 * | `load()` | resolves with every item, as `{item: value, …}` |
 * | `save(entries, options)` | saves `[{item, value}, …]`; `options.keepalive` is true when the page is being closed |
 * | `remove(items)` | deletes the items of an array of names |
 *
 * ```javascript
 * import {config} from 'ricochet/core/config.mjs'
 *
 * config.setAdapter(myAdapter)
 * await config.load()
 * ```
 *
 * @module config
 * @fires configLoaded - The items are loaded for the first time.
 * @fires configRefreshed - The items are loaded again.
 */

import {bus} from './bus.mjs'
import {$global} from './global.mjs'
import {logTime, pushLog} from './debug.mjs'
import {setItemStore} from './items.mjs'
import {declareTasks} from './microtasker.mjs'
import {scheduler} from './scheduler.mjs'

const SAVE_DELAY = 2000
const RETRY_DELAY = 30000

/**
 * A store of configuration items. The application uses the `config` instance; other instances are useful for tests.
 */
export class ConfigStore {
  #adapter = null
  #items = null // null until loaded; then a dictionary item → value
  #loading = false
  #scope = ''
  #observers = new Map() // id → {items, recall, scoped}
  #nextId = 1
  #triggered = new Set() // ids of the observers to call at the end of the task
  #flushQueued = false
  #pending = new Set() // names of the items changed and not saved yet
  #saveEvent
  #saving = null // promise of the save in progress
  #saveDelay
  #retryDelay

  /**
   * @param {{name: string, saveDelay: number, retryDelay: number}} [options] - `name` of the store (default
   *   `config`), which names its save task (`configSave`); delays in milliseconds before saving changes (default
   *   2000) and before saving them again after a failure (default 30000).
   */
  constructor ({name = 'config', saveDelay = SAVE_DELAY, retryDelay = RETRY_DELAY} = {}) {
    this.#saveEvent = `${name}Save`
    this.#saveDelay = saveDelay
    this.#retryDelay = retryDelay
    declareTasks({[this.#saveEvent]: {priority: 1, cost: 0.5}})
    bus.on(this.#saveEvent, () => { this.save() })
  }

  // ------------------------------------------------------------------ storage

  /**
   * Sets the adapter that loads and saves the items.
   * @param {object} adapter - An object with `load()`, `save(entries, options)` and `remove(items)`.
   */
  setAdapter (adapter) {
    for (const method of ['load', 'save', 'remove']) {
      console.assert(typeof adapter?.[method] === 'function', `ConfigStore.setAdapter: the adapter has no ${method}() method`)
    }
    this.#adapter = adapter
  }

  /**
   * Loads every item from the adapter, then calls every observer. Pending changes are saved first. Items cannot be
   * changed while they load.
   * @returns {Promise<void>} Resolved once the items are loaded; rejected with the error of the adapter.
   * @fires configLoaded - The first time.
   * @fires configRefreshed - The next times.
   */
  async load () {
    if (this.#adapter === null) { throw new Error('ConfigStore.load: no adapter, call setAdapter() first') }
    if (this.#pending.size > 0 || this.#saving !== null) { await this.save() }
    const refresh = this.#items !== null
    this.#loading = true
    try {
      const items = await this.#adapter.load()
      this.#items = Object.assign(Object.create(null), items)
    } finally {
      this.#loading = false
    }
    for (const id of this.#observers.keys()) { this.#trigger(id) }
    bus.emit(refresh ? 'configRefreshed' : 'configLoaded', {})
  }

  /**
   * Saves the pending changes now, without waiting for the delay.
   * @param {{keepalive: boolean}} [options] - Passed to the adapter; `keepalive` when the page is being closed.
   * @returns {Promise<boolean>} `true` if every change is saved, `false` if the adapter failed (the changes stay
   *   pending and are saved again later).
   */
  async save (options = {}) {
    scheduler.cancel(this.#saveEvent)
    while (this.#saving !== null) { await this.#saving } // one save at a time
    if (this.#pending.size === 0 || this.#items === null) { return true }
    const names = [...this.#pending]
    this.#pending.clear()
    const entries = names.map(item => ({item, value: this.#items[item]}))
    let saved = true
    this.#saving = (async () => {
      try {
        await this.#adapter.save(entries, {keepalive: options.keepalive === true})
      } catch (error) {
        saved = false
        console.error('ConfigStore.save: items not saved, next attempt later', names, error)
        for (const item of names) { this.#pending.add(item) }
        this.#schedule(this.#retryDelay)
      }
    })()
    await this.#saving
    this.#saving = null
    return saved
  }

  // the save is a scheduled task: the first change schedules it, the next ones join it
  #schedule (delay) {
    scheduler.schedule(this.#saveEvent, null, delay, {id: this.#saveEvent, mode: 'once'})
  }

  // ------------------------------------------------------------------ reading

  /**
   * Current value of an item.
   * @param {string} item - Item name; `$` stands for the scope.
   * @returns {string|undefined} The value, or `undefined` if the item does not exist or the items are not loaded.
   */
  get (item) {
    return this.#items === null ? undefined : this.#items[this.#resolve(item)]
  }

  /**
   * Names of every item.
   * @returns {string[]} The names, in no particular order; empty while the items are not loaded.
   */
  keys () {
    return this.#items === null ? [] : Object.keys(this.#items)
  }

  /** `true` once the items are loaded. */
  get loaded () { return this.#items !== null }

  // ------------------------------------------------------------------ scope

  /**
   * Sets the string that replaces `$` in item names. The observers of items holding `$` are called if their values
   * change.
   * @param {string} scope - The new scope.
   */
  setScope (scope) {
    const previous = this.#scope
    if (scope === previous) { return }
    this.#scope = scope
    if (this.#items === null) { return }
    for (const [id, observer] of this.#observers) {
      if (!observer.scoped) { continue }
      const changed = observer.items.some(item => item.includes('$') &&
        this.#items[item.replace('$', previous)] !== this.#items[item.replace('$', scope)])
      if (changed) { this.#trigger(id) }
    }
  }

  /** The current scope. */
  get scope () { return this.#scope }

  #resolve (item) { return item.replace('$', this.#scope) }

  // ------------------------------------------------------------------ writing

  /**
   * Changes an item: at once in memory, then in the storage after the delay. Observers are called if the value
   * changes.
   * @param {string} item - Item name; `$` stands for the scope.
   * @param {string} value - The new value.
   */
  setItem (item, value) { this.#set(item, false, undefined, value) }

  /**
   * Changes an item only if its current value is `expected`.
   * @param {string} item - Item name; `$` stands for the scope.
   * @param {string} expected - The value the item must have.
   * @param {string} value - The new value.
   */
  setItemIfValue (item, expected, value) { this.#set(item, true, expected, value) }

  #set (item, test, expected, value) {
    const name = this.#resolve(item)
    if (this.#items === null || this.#loading) {
      console.warn('ConfigStore.setItem: the items are loading, change ignored', name, value)
      return
    }
    const previous = this.#items[name]
    if (test && previous !== expected) { return }
    if (previous === value) { return }
    this.#items[name] = value
    this.#log(name, previous, value)
    this.#pending.add(name)
    this.#schedule(this.#saveDelay)
    this.#changed(name)
  }

  /**
   * Deletes an item, in memory and in the storage. Observers of the item are called.
   * @param {string} item - Item name; `$` stands for the scope.
   * @returns {Promise<void>} Resolved once the adapter has deleted it.
   */
  async remove (item) {
    const name = this.#resolve(item)
    if (this.#items === null || this.#adapter === null) { return }
    const previous = this.#items[name]
    delete this.#items[name]
    this.#pending.delete(name)
    this.#log(name, previous, undefined)
    this.#changed(name)
    await this.#adapter.remove([name])
  }

  #log (item, previous, current) {
    const time = logTime()
    pushLog($global.logs.items, {item, current, previous, time})
    pushLog($global.logs.timeline, {item, detail: `${previous} => ${current}`, time})
  }

  // ------------------------------------------------------------------ observers

  /**
   * Observes items: `recall` is called with the current values at the end of the current task, then whenever one of
   * them changes.
   * @param {string[]} items - Item names; `$` stands for the scope.
   * @param {Function} recall - Called with `{item: value, …}`, keyed by the names given here.
   * @returns {number} An id for `removeObserver()`.
   */
  addObserver (items, recall) {
    const id = this.#nextId++
    this.#observers.set(id, {items, recall, scoped: items.some(item => item.includes('$'))})
    this.#trigger(id)
    return id
  }

  /**
   * Stops an observation. Its pending call, if any, is cancelled.
   * @param {number} id - The id returned by `addObserver()`.
   */
  removeObserver (id) {
    this.#observers.delete(id)
    this.#triggered.delete(id)
  }

  #changed (name) {
    for (const [id, observer] of this.#observers) {
      if (observer.items.some(item => this.#resolve(item) === name)) { this.#trigger(id) }
    }
  }

  #trigger (id) {
    this.#triggered.add(id)
    if (this.#flushQueued) { return }
    this.#flushQueued = true
    queueMicrotask(() => this.#flush())
  }

  #flush () {
    this.#flushQueued = false
    const ids = [...this.#triggered]
    this.#triggered.clear()
    for (const id of ids) {
      const observer = this.#observers.get(id)
      if (observer === undefined) { continue } // removed by an observer called before
      const values = {}
      for (const item of observer.items) { values[item] = this.get(item) }
      try {
        observer.recall(values)
      } catch (error) {
        console.error('ConfigStore: an observer failed', observer.items, error)
      }
    }
  }
}

/** The store of configuration items of the application. */
export const config = new ConfigStore()
setItemStore(config)

// pending changes are saved when the page is hidden or closed
if (typeof window !== 'undefined') {
  const saveNow = () => { config.save({keepalive: true}) }
  window.addEventListener('pagehide', saveNow)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { saveNow() } })
}
