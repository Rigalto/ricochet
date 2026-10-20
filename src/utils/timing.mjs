// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Debounce and throttle: calls that come in bursts (keys typed, a window resized, a slider dragged) turned into few
 * events. In Ricochet, everything is an event: these functions emit an **event**, through the scheduled tasks and
 * the microtasks of the kernel (see the `scheduler` and `microtasker` modules), instead of calling a function as
 * lodash does. The work runs in the spare time of a frame, with the priority and the cost declared for the event.
 *
 * | Function | The event is emitted | Use |
 * | --- | --- | --- |
 * | `debounce(event, wait)` | once the calls have stopped for `wait` ms, with the last payload | save a text after typing, search after the last key |
 * | `throttle(event, wait)` | at most once every `wait` ms: at the first call, then at the end of each period if calls came | follow a drag, a scroll, a resize |
 *
 * Both return a function, the **trigger**, called with the payload of the event. The trigger also has:
 *
 * | Member | Role |
 * | --- | --- |
 * | `cancel()` | forgets the waiting event |
 * | `flush()` | emits the waiting event at once (as a microtask), instead of at its time |
 * | `pending` | `true` while an event waits |
 *
 * ```javascript
 * import {declareTasks} from 'ricochet/ricochet.mjs'
 * import {debounce, throttle} from 'ricochet/ricochet-utils.mjs'
 *
 * declareTasks({noteSave: {priority: 2, cost: 1}})
 *
 * class NoteEditor extends WComponent {
 *   attach () {
 *     this.elText = this.element.querySelector('textarea')
 *     this.save = debounce('noteSave', 1500, {owner: this}) // cancelled when the component is detached
 *     this.observeDom(this.elText, 'input', 'textTyped')
 *     this.listen('noteSave')
 *   }
 *
 *   textTyped () { this.save({text: this.elText.value}) } // at each key
 *
 *   noteSaveDispatched ({text}) { … } // 1.5 s after the last key
 * }
 * ```
 *
 * **Options.** `owner`: the component the waiting events belong to, cancelled when it is detached; `clock`: `'real'`
 * (default) or `'game'`, the clock of the delay (see the `clock` module). `throttle()` also takes `leading` (emit at
 * the first call, default `true`) and `trailing` (emit at the end of a period with the last payload, default `true`).
 *
 * The function `promiseState(promise)` tells whether a promise is `'pending'`, `'fulfilled'` or `'rejected'`.
 *
 * @module timing
 */

import {microtasker as kernelMicrotasker} from '../core/microtasker.mjs'
import {scheduler as kernelScheduler} from '../core/scheduler.mjs'
import {realClock, gameClock} from '../core/clock.mjs'

let count = 0

// the kernel by default; tests give their own
const kernel = ({scheduler = kernelScheduler, microtasker = kernelMicrotasker, clocks = {real: realClock, game: gameClock}}) =>
  ({scheduler, microtasker, clocks})

/**
 * Emits an event once the calls have stopped for a while.
 * @param {string} event - The event emitted, with the payload of the last call.
 * @param {number} wait - The quiet time, in milliseconds.
 * @param {{owner: object, clock: string}} [options] - See the module.
 * @returns {Function} The trigger: `trigger(payload)`, with `cancel()`, `flush()` and `pending`.
 */
export const debounce = (event, wait, options = {}) => {
  const {owner = null, clock = 'real'} = options
  const {scheduler, microtasker} = kernel(options)
  const id = `rc-debounce-${++count}`
  let last
  const trigger = payload => {
    last = payload
    scheduler.schedule(event, payload, wait, {id, clock, owner, mode: 'restart'})
  }
  trigger.cancel = () => { scheduler.cancel(id) }
  trigger.flush = () => {
    if (scheduler.cancel(id) > 0) { microtasker.defer(event, last, {owner}) }
  }
  Object.defineProperty(trigger, 'pending', {get: () => scheduler.has(id)})
  return trigger
}

/**
 * Emits an event at most once in a period.
 * @param {string} event - The event emitted.
 * @param {number} wait - The period, in milliseconds.
 * @param {{owner: object, clock: string, leading: boolean, trailing: boolean}} [options] - See the module.
 * @returns {Function} The trigger: `trigger(payload)`, with `cancel()`, `flush()` and `pending`.
 */
export const throttle = (event, wait, options = {}) => {
  const {owner = null, clock = 'real', leading = true, trailing = true} = options
  const {scheduler, microtasker, clocks} = kernel(options)
  const id = `rc-throttle-${++count}`
  let end = -Infinity // end of the current period
  let last
  const trigger = payload => {
    last = payload
    const now = clocks[clock].time
    const due = scheduler.dueTime(id)
    if (due !== null) {
      // an event waits for the end of the period: it takes the last payload
      scheduler.schedule(event, payload, 0, {id, clock, owner, at: due, mode: 'restart'})
      return
    }
    if (now >= end) {
      // a new period
      end = now + wait
      if (leading) {
        microtasker.defer(event, payload, {owner})
      } else if (trailing) {
        scheduler.schedule(event, payload, 0, {id, clock, owner, at: end, mode: 'restart'})
      }
    } else if (trailing) {
      // within the period: the event waits for its end, and the next period starts then
      scheduler.schedule(event, payload, 0, {id, clock, owner, at: end, mode: 'restart'})
      end += wait
    }
  }
  trigger.cancel = () => {
    scheduler.cancel(id)
    end = -Infinity
  }
  trigger.flush = () => {
    if (scheduler.cancel(id) > 0) { microtasker.defer(event, last, {owner}) }
  }
  Object.defineProperty(trigger, 'pending', {get: () => scheduler.has(id)})
  return trigger
}

/**
 * The state of a promise, without waiting for it.
 * @param {Promise} promise - The promise.
 * @returns {Promise<string>} `'pending'`, `'fulfilled'` or `'rejected'`.
 */
export const promiseState = promise => {
  const PENDING = Symbol('pending')
  return Promise.race([promise, PENDING]).then(
    value => value === PENDING ? 'pending' : 'fulfilled',
    () => 'rejected')
}
