// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The frame loop: one `requestAnimationFrame` loop for the whole page, that runs only when something needs it.
 *
 * ## Cycles of 60 Hz
 *
 * The work is organised in **cycles of 1/60 s**, whatever the refresh rate of the screen, with a budget in
 * milliseconds tuned for that rate: 3 ms for `update`, 4 ms for `render`, 5 ms for microtasks (`setBudget()`). The
 * costs of the microtasks are measured on the computer the application is tuned on, so the budget does not shrink on
 * a faster screen.
 *
 * - **60 Hz screen**: each frame is a cycle: clocks and scheduled tasks, `update`, `render`, then microtasks in the
 *   time left.
 * - **120 Hz screen**: a cycle spans two frames: the first runs `update` and microtasks, the second `render` and
 *   microtasks. Games are drawn at 60 Hz, and the microtasks get the same time as at 60 Hz.
 * - **Faster screens**: a cycle spans as many frames as fit in 1/60 s; the frames after `render` run microtasks only.
 *
 * The refresh rate is measured continuously. Each frame gets a share of the budget proportional to its duration.
 *
 * ## When it runs
 *
 * The loop runs while a component holds it with `setAnimationFrame()`, or while microtasks are waiting. Otherwise it
 * stops, and wakes up when a microtask is deferred or when the next real time task is due. The game clock advances
 * only while a component holds the loop.
 *
 * ## Animations
 *
 * `addAnimation(owner, update, render)` registers two functions, called with `(time, dt)` at each cycle: `time` is
 * the timestamp of the frame, `dt` the duration of the cycle in milliseconds, bounded to 65 ms (one cycle after a
 * pause of more than a second). Components use `setAnimationFrame()` instead.
 *
 * @module loop
 */

import {$global} from './global.mjs'
import {gameClock} from './clock.mjs'
import {microtasker} from './microtasker.mjs'
import {scheduler} from './scheduler.mjs'

const CYCLE = 1000 / 60
const MAX_STEP = 65
const LONG_PAUSE = 1000
const DEFAULT_BUDGET = {update: 3, render: 4, microtask: 5}

const browserRequest = typeof requestAnimationFrame === 'function'
  ? fn => requestAnimationFrame(fn)
  : fn => setTimeout(() => fn(performance.now()), CYCLE) // Node: tests

const unref = timer => { timer?.unref?.(); return timer }

/**
 * The frame loop. The application uses the `loop` instance.
 */
export class FrameLoop {
  #animations = new Map() // owner → {update, render}
  #running = false
  #wakeTimer = null
  #wakeTime = null
  #frameMs = CYCLE // measured duration of a frame, moving average
  #lastFrame = null
  #lastUpdate = null
  #phase = 0 // index of the frame in the cycle
  #dt = CYCLE
  #budget = {...DEFAULT_BUDGET}
  #last = {update: 0, render: 0, microtasks: 0, tasks: 0}
  #request
  #now
  #setTimer
  #clearTimer
  #clock
  #microtasker
  #scheduler

  /**
   * @param {object} [options] - For tests: `request(fn)` (default `requestAnimationFrame`), `now()` (default
   *   `performance.now()`), `setTimer(fn, delay)` and `clearTimer(id)`, `clock`, `microtasker` and `scheduler`
   *   (default: those of the kernel).
   */
  constructor ({
    request = browserRequest,
    now = () => performance.now(),
    setTimer = (fn, delay) => unref(setTimeout(fn, delay)),
    clearTimer = id => clearTimeout(id),
    clock = gameClock,
    microtasker: tasks = microtasker,
    scheduler: schedule = scheduler,
  } = {}) {
    this.#request = request
    this.#now = now
    this.#setTimer = setTimer
    this.#clearTimer = clearTimer
    this.#clock = clock
    this.#microtasker = tasks
    this.#scheduler = schedule
    this.frame = this.frame.bind(this)
    tasks.setWaker(() => this.wake())
    schedule.setWaker(() => this.#armTimer())
  }

  /**
   * Sets the budget of a 60 Hz cycle, in milliseconds.
   * @param {{update: number, render: number, microtask: number}} budget - Budget of each phase; missing phases keep
   *   their value.
   */
  setBudget (budget) { this.#budget = {...this.#budget, ...budget} }

  /**
   * Registers the animation of an owner, which holds the loop until it is removed. An owner has one animation:
   * registering another replaces it.
   * @param {object} owner - The component.
   * @param {Function|null} update - Called with `(time, dt)` in the update phase of each cycle.
   * @param {Function|null} [render] - Called with `(time, dt)` in the render phase of each cycle.
   */
  addAnimation (owner, update, render = null) {
    this.#animations.set(owner, {update, render})
    this.wake()
  }

  /**
   * Removes the animation of an owner.
   * @param {object} owner - The component.
   */
  removeAnimation (owner) { this.#animations.delete(owner) }

  /** `true` while a component holds the loop. */
  get held () { return this.#animations.size > 0 }

  /** `true` while the loop runs. */
  get running () { return this.#running }

  /** Starts the loop if it is stopped. Called when there is work to do. */
  wake () {
    if (this.#running) { return }
    this.#running = true
    this.#clearWake()
    this.#lastFrame = null
    this.#lastUpdate = null
    this.#phase = 0
    this.#request(this.frame)
  }

  // while the loop sleeps, a timer wakes it when the next real time task is due
  #armTimer () {
    if (this.#running) { return }
    const due = this.#scheduler.nextRealTime()
    if (due === null || (this.#wakeTime !== null && this.#wakeTime <= due)) { return }
    this.#clearWake()
    this.#wakeTime = due
    this.#wakeTimer = this.#setTimer(() => {
      this.#wakeTimer = null
      this.#wakeTime = null
      this.wake()
    }, Math.max(0, due - this.#now()))
  }

  #clearWake () {
    if (this.#wakeTimer !== null) { this.#clearTimer(this.#wakeTimer) }
    this.#wakeTimer = null
    this.#wakeTime = null
  }

  /**
   * Runs one frame. Kernel internal: called by `requestAnimationFrame`.
   * @param {number} time - Timestamp of the frame.
   */
  frame (time) {
    const start = this.#now()
    if (this.#lastFrame !== null) {
      const raw = time - this.#lastFrame
      if (raw > 0 && raw < 100) { this.#frameMs = this.#frameMs * 0.9 + raw * 0.1 }
    }
    this.#lastFrame = time
    const framesPerCycle = Math.max(1, Math.round(CYCLE / this.#frameMs))
    if (this.#phase >= framesPerCycle) { this.#phase = 0 }
    const isUpdate = this.#phase === 0
    const isRender = framesPerCycle === 1 || this.#phase === 1
    const held = this.held
    const total = this.#budget.update + this.#budget.render + this.#budget.microtask
    const frameBudget = total * Math.min(1, this.#frameMs / CYCLE)

    if (isUpdate) {
      let dt = this.#lastUpdate === null ? CYCLE : time - this.#lastUpdate
      if (dt > LONG_PAUSE) { dt = CYCLE } else if (dt > MAX_STEP) { dt = MAX_STEP }
      this.#lastUpdate = time
      this.#dt = dt
      if (held) { this.#clock.advance(dt) }
      this.#scheduler.update(held)
      for (const [owner, {update}] of this.#animations) { this.#call(owner, update, time, dt, 'update') }
    }
    const afterUpdate = this.#now()
    if (isRender) {
      for (const [owner, {render}] of this.#animations) { this.#call(owner, render, time, this.#dt, 'render') }
    }
    const afterRender = this.#now()
    const tasks = this.#microtasker.run(Math.max(0, frameBudget - (afterRender - start)), isUpdate)
    const end = this.#now()

    if (isUpdate) { this.#last.update = afterUpdate - start }
    if (isRender) { this.#last.render = afterRender - afterUpdate }
    this.#last.microtasks = end - afterRender
    this.#last.tasks = tasks
    if ($global.debug.tasks && end - start > frameBudget + 1) {
      console.warn(`FrameLoop: frame over budget, ${(end - start).toFixed(2)} ms for ${frameBudget.toFixed(2)} ms`, {...this.#last})
    }

    this.#phase++
    if (this.held || this.#microtasker.size > 0) {
      this.#request(this.frame)
    } else {
      this.#running = false
      this.#armTimer()
    }
  }

  #call (owner, fn, time, dt, phase) {
    if (fn === null || fn === undefined) { return }
    try {
      fn(time, dt)
    } catch (error) {
      console.error(`FrameLoop: ${phase} of ${owner?.constructor?.name ?? 'an animation'} failed`, error)
    }
  }

  /**
   * State of the loop, for debugging.
   * @returns {object} `{running, held, fps, framesPerCycle, budget, last}`: `fps` is the measured refresh rate,
   *   `last` the durations of the last phases in milliseconds and the number of microtasks run in the last frame.
   */
  stats () {
    return {
      running: this.#running,
      held: this.held,
      fps: Math.round(1000 / this.#frameMs),
      framesPerCycle: Math.max(1, Math.round(CYCLE / this.#frameMs)),
      budget: {...this.#budget},
      last: {...this.#last},
    }
  }
}

/** The frame loop of the application. */
export const loop = new FrameLoop()
