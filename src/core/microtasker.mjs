// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Microtasks: events deferred to the spare time of the frames. A microtask is an event name and a payload; when it
 * runs, the event is emitted on the bus and its listeners do the work.
 *
 * - **Priority and cost.** The module that does the work declares, once, the priority and the cost of its events
 *   with `declareTasks()`. The cost is an estimate of the duration of the work, in milliseconds, with a resolution of
 *   a quarter of a millisecond, measured on the computer the application is tuned on (see `stats()`).
 * - **Budget.** At each frame, the frame loop gives the time left to `run()`: the task of highest priority runs at
 *   the start of each cycle whatever its cost, then the tasks of highest priority whose cost fits in the time left.
 *   Tasks of the same priority and cost run in the order they were deferred.
 * - **Owner.** A task deferred by a component (`this.defer()`) belongs to it and is cancelled when it is detached.
 *
 * ```javascript
 * import {declareTasks, defer} from 'ricochet/core/microtasker.mjs'
 *
 * declareTasks({tileUpdate: {priority: 5, cost: 0.5}})
 * defer('tileUpdate', {x: 3, y: 4})
 * ```
 *
 * @module microtasker
 */

import {bus} from './bus.mjs'
import {$global} from './global.mjs'

const DEFAULT_TASK = {priority: 0, cost: 1}
const MAX_COST_UNITS = 20 // 5 ms
const SLOW_TASK = 5 // ms: a task that takes longer is reported
const QUEUE_WARNING = 100
const HISTOGRAM_BINS = 11 // 0.5 ms each, the last one for 5 ms and more

const leaks = $global.memoryLeak

/**
 * A queue of microtasks. The application uses the `microtasker` instance.
 */
export class Microtasker {
  #declared = new Map() // event → {priority, units}
  #queue = [] // sorted by key, the task to run first at the end
  #stats = new Map() // event → {count, total, max, histogram}
  #warned = new Set()
  #now
  #onQueue = () => {}

  /**
   * @param {{now: Function}} [options] - `now()` returns the current time in milliseconds (default:
   *   `performance.now()`).
   */
  constructor ({now = () => performance.now()} = {}) {
    this.#now = now
  }

  /**
   * Declares the priority and the cost of events run as microtasks. Called once by the module that does the work.
   * @param {object} table - `{event: {priority, cost}, …}`: `priority` is an integer, higher runs first; `cost` is
   *   the expected duration in milliseconds (0.25 to 5).
   */
  declare (table) {
    for (const [event, {priority = DEFAULT_TASK.priority, cost = DEFAULT_TASK.cost}] of Object.entries(table)) {
      this.#declared.set(event, {priority, units: Math.max(1, Math.min(MAX_COST_UNITS, Math.ceil(cost * 4)))})
    }
  }

  /**
   * Called by the frame loop: `fn()` is called whenever a task is queued. Kernel internal.
   * @param {Function} fn - The function to call.
   */
  setWaker (fn) { this.#onQueue = fn }

  /**
   * Defers an event to the spare time of the next frames.
   * @param {string} event - Event name.
   * @param {*} [payload] - Data given to the listeners.
   * @param {{once: boolean, owner: object}} [options] - `once`: not queued if the same event of the same owner is
   *   already waiting; `owner`: the component the task belongs to.
   */
  defer (event, payload, {once = false, owner = null} = {}) {
    if (once && this.#queue.some(task => task.event === event && task.owner === owner)) { return }
    let declared = this.#declared.get(event)
    if (declared === undefined) {
      if ($global.debug.tasks && !this.#warned.has(event)) {
        this.#warned.add(event)
        console.warn(`Microtasker: '${event}' is not declared, default priority and cost used (declareTasks)`)
      }
      declared = {priority: DEFAULT_TASK.priority, units: DEFAULT_TASK.cost * 4}
    }
    const task = {event, payload, owner, priority: declared.priority, units: declared.units,
      key: declared.priority * 32 + declared.units}
    // binary search of the first task with a key greater or equal: the new task goes before the tasks of the same
    // key, so that they run first
    let low = 0
    let high = this.#queue.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (this.#queue[mid].key < task.key) { low = mid + 1 } else { high = mid }
    }
    this.#queue.splice(low, 0, task)
    if (owner !== null) { leaks.microtasks += 1 }
    if (this.#queue.length === QUEUE_WARNING) { console.warn(`Microtasker: ${QUEUE_WARNING} tasks waiting`, this.list()) }
    this.#onQueue()
  }

  /**
   * Cancels the waiting tasks of an owner. Called when a component is released.
   * @param {object} owner - The component.
   */
  cancelOwner (owner) {
    const before = this.#queue.length
    this.#queue = this.#queue.filter(task => task.owner !== owner)
    leaks.microtasks -= before - this.#queue.length
  }

  /**
   * Runs waiting tasks within a budget. Kernel internal: called by the frame loop.
   * @param {number} budget - Time available, in milliseconds.
   * @param {boolean} [force] - Runs the task of highest priority even if its cost exceeds the budget.
   * @returns {number} The number of tasks run.
   */
  run (budget, force = false) {
    if (this.#queue.length === 0) { return 0 }
    const deadline = this.#now() + budget
    let count = 0
    if (force) {
      this.#execute(this.#queue.length - 1)
      count++
    }
    while (this.#queue.length > 0) {
      const units = Math.floor((deadline - this.#now()) * 4)
      if (units <= 0) { break }
      let index = this.#queue.length - 1
      while (index >= 0 && this.#queue[index].units > units) { index-- }
      if (index < 0) { break }
      this.#execute(index)
      count++
    }
    return count
  }

  #execute (index) {
    const [task] = this.#queue.splice(index, 1)
    if (task.owner !== null) { leaks.microtasks -= 1 }
    const start = this.#now()
    bus.emit(task.event, task.payload)
    const duration = this.#now() - start
    if (duration > SLOW_TASK) { console.warn(`Microtasker: '${task.event}' took ${duration.toFixed(2)} ms`) }
    let stats = this.#stats.get(task.event)
    if (stats === undefined) {
      stats = {count: 0, total: 0, max: 0, histogram: new Array(HISTOGRAM_BINS).fill(0)}
      this.#stats.set(task.event, stats)
    }
    stats.count++
    stats.total += duration
    if (duration > stats.max) { stats.max = duration }
    stats.histogram[Math.min(HISTOGRAM_BINS - 1, Math.floor(duration / 0.5))]++
  }

  /** Number of waiting tasks. */
  get size () { return this.#queue.length }

  /**
   * The waiting tasks, the next to run first.
   * @returns {string[]} One line per task: event, priority and cost.
   */
  list () {
    return this.#queue.map(t => `${t.event} (priority ${t.priority}, cost ${t.units / 4} ms)`).reverse()
  }

  /**
   * Durations measured for each event, to tune the declared costs: count, mean, maximum, and a histogram of
   * half-millisecond bins (the last bin counts 5 ms and more).
   * @returns {object} `{event: {count, mean, max, histogram, cost}, …}`; `cost` is the declared cost.
   */
  stats () {
    const result = {}
    for (const [event, s] of this.#stats) {
      const declared = this.#declared.get(event)
      result[event] = {count: s.count, mean: s.total / s.count, max: s.max, histogram: [...s.histogram],
        cost: declared === undefined ? null : declared.units / 4}
    }
    return result
  }

  /** Forgets the measured durations. */
  resetStats () { this.#stats.clear() }

  /** Removes every waiting task. */
  clear () {
    for (const task of this.#queue) { if (task.owner !== null) { leaks.microtasks -= 1 } }
    this.#queue.length = 0
  }
}

/** The microtask queue of the application. */
export const microtasker = new Microtasker()

/**
 * Declares the priority and the cost of events run as microtasks (see `Microtasker.declare()`).
 * @param {object} table - `{event: {priority, cost}, …}`.
 */
export const declareTasks = table => microtasker.declare(table)

/**
 * Defers an event to the spare time of the next frames (see `Microtasker.defer()`).
 * @param {string} event - Event name.
 * @param {*} [payload] - Data given to the listeners.
 * @param {{once: boolean, owner: object}} [options] - See `Microtasker.defer()`.
 */
export const defer = (event, payload, options) => microtasker.defer(event, payload, options)
