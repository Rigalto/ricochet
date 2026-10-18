// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Scheduled tasks: events due at a given time, in real time or in game time (see the `clock` module). A scheduled
 * task is an event name and a payload; when it is due, it becomes a microtask (see the `microtasker` module), run in
 * the spare time of the frame with the priority and the cost declared for its event.
 *
 * - **Identifier.** A task may have an `id`, used to cancel it or to find it again; several tasks may share an id.
 * - **Modes.** `add` (default) adds a task; `once` adds it only if no task with the same id is waiting; `restart`
 *   replaces the waiting tasks with the same id; `extend` pushes back the due time of the waiting task with the same
 *   id by the delay (or adds it, if there is none).
 * - **Order.** Tasks due at the same time run in the order they were scheduled.
 * - **Owner.** A task scheduled by a component (`this.schedule()`) belongs to it and is cancelled when it is detached.
 *
 * Real time tasks wait while the page is hidden: the browser stops the frames.
 *
 * ```javascript
 * import {schedule, cancel} from 'ricochet/core/scheduler.mjs'
 *
 * schedule('configSave', null, 2000, {id: 'configSave', mode: 'once'})
 * schedule('plantGrow', {plant: 12}, 30000, {clock: 'game'})
 * cancel('configSave')
 * ```
 *
 * @module scheduler
 */

import {$global} from './global.mjs'
import {realClock, gameClock} from './clock.mjs'
import {microtasker} from './microtasker.mjs'

const leaks = $global.memoryLeak
const MODES = new Set(['add', 'once', 'restart', 'extend'])

const matches = (id, idOrRegex) => idOrRegex instanceof RegExp ? id !== null && idOrRegex.test(id) : id === idOrRegex

/**
 * The scheduled tasks. The application uses the `scheduler` instance.
 */
export class Scheduler {
  #queues = {real: [], game: []} // sorted by due time, the next due at the end
  #clocks
  #microtasker
  #onQueue = () => {}

  /**
   * @param {{clocks: object, microtasker: object}} [options] - The clocks (`{real, game}`, objects with a `time`)
   *   and the microtask queue; default: those of the kernel.
   */
  constructor ({clocks = {real: realClock, game: gameClock}, microtasker: tasks = microtasker} = {}) {
    this.#clocks = clocks
    this.#microtasker = tasks
  }

  /**
   * Called by the frame loop: `fn()` is called whenever a task is scheduled. Kernel internal.
   * @param {Function} fn - The function to call.
   */
  setWaker (fn) { this.#onQueue = fn }

  /**
   * Schedules an event.
   * @param {string} event - Event name.
   * @param {*} payload - Data given to the listeners.
   * @param {number} delay - Delay in milliseconds, from now.
   * @param {{id: string, clock: string, mode: string, at: number, owner: object}} [options] - `id` of the task;
   *   `clock`: `'real'` (default) or `'game'`; `mode`: `'add'` (default), `'once'`, `'restart'` or `'extend'`; `at`:
   *   due time in that clock, instead of the delay; `owner`: the component the task belongs to.
   * @returns {number} The due time of the task, in the clock of the task.
   */
  schedule (event, payload, delay, {id = null, clock = 'real', mode = 'add', at, owner = null} = {}) {
    console.assert(MODES.has(mode), `Scheduler.schedule: unknown mode '${mode}'`)
    console.assert(clock === 'real' || clock === 'game', `Scheduler.schedule: unknown clock '${clock}'`)
    const queue = this.#queues[clock]
    const now = this.#clocks[clock].time
    let time = at ?? now + delay
    if (id !== null && mode !== 'add') {
      const waiting = queue.filter(task => !task.removed && task.id === id)
      if (mode === 'once' && waiting.length > 0) { return waiting[0].time }
      if (mode === 'extend' && waiting.length === 1) { time = waiting[0].time + delay }
      if (mode === 'restart' || mode === 'extend') { for (const task of waiting) { this.#remove(task) } }
    }
    const task = {event, payload, id, time, owner, removed: false}
    // binary search of the first task due at the same time or sooner: the new task goes before the tasks due at the
    // same time, so that they run first
    let low = 0
    let high = queue.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (queue[mid].time > time) { low = mid + 1 } else { high = mid }
    }
    queue.splice(low, 0, task)
    if (owner !== null) { leaks.scheduledTasks += 1 }
    this.#onQueue()
    return time
  }

  #remove (task) {
    task.removed = true
    if (task.owner !== null) { leaks.scheduledTasks -= 1 }
  }

  /**
   * Cancels waiting tasks.
   * @param {string|RegExp} idOrRegex - The id of the tasks, or a regular expression matched against the ids.
   * @param {object} [owner] - Only the tasks of this owner.
   * @returns {number} The number of tasks cancelled.
   */
  cancel (idOrRegex, owner) {
    let count = 0
    for (const queue of Object.values(this.#queues)) {
      for (const task of queue) {
        if (!task.removed && matches(task.id, idOrRegex) && (owner === undefined || task.owner === owner)) {
          this.#remove(task)
          count++
        }
      }
    }
    return count
  }

  /**
   * Cancels the waiting tasks of an owner. Called when a component is released.
   * @param {object} owner - The component.
   */
  cancelOwner (owner) {
    for (const queue of Object.values(this.#queues)) {
      for (const task of queue) { if (!task.removed && task.owner === owner) { this.#remove(task) } }
    }
  }

  /**
   * Due time of the first waiting task with an id.
   * @param {string|RegExp} idOrRegex - The id, or a regular expression matched against the ids.
   * @returns {number|null} The due time, in the clock of the task, or `null` if no task waits.
   */
  dueTime (idOrRegex) {
    for (const queue of Object.values(this.#queues)) {
      for (let i = queue.length - 1; i >= 0; i--) {
        const task = queue[i]
        if (!task.removed && matches(task.id, idOrRegex)) { return task.time }
      }
    }
    return null
  }

  /**
   * `true` if a task with this id waits.
   * @param {string|RegExp} idOrRegex - The id, or a regular expression matched against the ids.
   * @returns {boolean} Whether such a task waits.
   */
  has (idOrRegex) { return this.dueTime(idOrRegex) !== null }

  /**
   * Turns the tasks that are due into microtasks. Kernel internal: called by the frame loop at each cycle.
   * @param {boolean} [game] - Also the tasks in game time (only while a game holds the loop).
   * @returns {number} The number of tasks that were due.
   */
  update (game = false) {
    let count = this.#release(this.#queues.real, this.#clocks.real.time)
    if (game) { count += this.#release(this.#queues.game, this.#clocks.game.time) }
    return count
  }

  #release (queue, now) {
    let count = 0
    while (queue.length > 0 && queue[queue.length - 1].time <= now) {
      const task = queue.pop()
      if (task.removed) { continue }
      if (task.owner !== null) { leaks.scheduledTasks -= 1 }
      this.#microtasker.defer(task.event, task.payload, {owner: task.owner})
      count++
    }
    return count
  }

  /**
   * Due time of the next real time task, to wake the frame loop. Kernel internal.
   * @returns {number|null} The due time, or `null` if no task waits.
   */
  nextRealTime () {
    const queue = this.#queues.real
    while (queue.length > 0 && queue[queue.length - 1].removed) { queue.pop() }
    return queue.length === 0 ? null : queue[queue.length - 1].time
  }

  /**
   * Number of waiting tasks.
   * @param {string} [clock] - `'real'` or `'game'`; both by default.
   * @returns {number} The number of tasks.
   */
  size (clock) {
    const count = queue => queue.reduce((n, task) => n + (task.removed ? 0 : 1), 0)
    return clock === undefined ? count(this.#queues.real) + count(this.#queues.game) : count(this.#queues[clock])
  }

  /**
   * The waiting tasks, the next due first.
   * @returns {string[]} One line per task: id, event, clock and time left.
   */
  list () {
    const lines = []
    for (const [clock, queue] of Object.entries(this.#queues)) {
      const now = this.#clocks[clock].time
      for (let i = queue.length - 1; i >= 0; i--) {
        const task = queue[i]
        if (!task.removed) { lines.push(`${task.id ?? '-'}: ${task.event} in ${(task.time - now).toFixed(0)} ms (${clock})`) }
      }
    }
    return lines
  }

  /** Removes every waiting task. */
  clear () {
    for (const queue of Object.values(this.#queues)) {
      for (const task of queue) { if (!task.removed) { this.#remove(task) } }
      queue.length = 0
    }
  }
}

/** The scheduled tasks of the application. */
export const scheduler = new Scheduler()

/**
 * Schedules an event (see `Scheduler.schedule()`).
 * @param {string} event - Event name.
 * @param {*} payload - Data given to the listeners.
 * @param {number} delay - Delay in milliseconds.
 * @param {object} [options] - See `Scheduler.schedule()`.
 * @returns {number} The due time of the task.
 */
export const schedule = (event, payload, delay, options) => scheduler.schedule(event, payload, delay, options)

/**
 * Cancels waiting tasks (see `Scheduler.cancel()`).
 * @param {string|RegExp} idOrRegex - The id of the tasks, or a regular expression.
 * @returns {number} The number of tasks cancelled.
 */
export const cancel = idOrRegex => scheduler.cancel(idOrRegex)
