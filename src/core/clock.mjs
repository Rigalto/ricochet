// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The two clocks of the kernel, in milliseconds.
 *
 * - **Real time** (`realClock`): the time of the computer, `performance.now()`.
 * - **Game time** (`gameClock`): advances only while the frame loop runs for a game (a component holds it with
 *   `setAnimationFrame()`), by the duration of each cycle multiplied by `scale`. It stops while paused, and while the
 *   page is hidden. The frame loop bounds the step: after a pause of more than a second (computer asleep, page
 *   hidden), the clock advances by one cycle only; a slow cycle counts for 65 ms at most, so that a game slows down
 *   instead of jumping.
 *
 * A calendar (days, hours, weather) belongs to the game: it reads `gameClock.time`.
 *
 * A game without a frame loop (a puzzle, a word game) measures the time spent playing with a `Stopwatch`: it counts
 * real time, but only while the page is visible.
 *
 * @module clock
 */

/** Real time. */
export const realClock = {
  /** The current time, in milliseconds. */
  get time () { return performance.now() }
}

/**
 * Game time.
 */
export class GameClock {
  #time = 0
  #paused = false

  constructor () {
    /** Speed factor: 2 runs the game twice as fast. */
    this.scale = 1
  }

  /** The game time, in milliseconds. */
  get time () { return this.#time }

  /** `true` while paused. */
  get paused () { return this.#paused }

  /**
   * Sets the game time, for instance when a saved game is loaded.
   * @param {number} time - The game time, in milliseconds.
   */
  set (time) { this.#time = time }

  /** Stops the game time. */
  pause () { this.#paused = true }

  /** Restarts the game time. */
  resume () { this.#paused = false }

  /**
   * Advances the game time. Called by the frame loop at each cycle. Kernel internal.
   * @param {number} dt - Duration of the cycle, in milliseconds, already bounded by the loop.
   * @returns {number} The duration added to the game time.
   */
  advance (dt) {
    if (this.#paused) { return 0 }
    const step = dt * this.scale
    this.#time += step
    return step
  }
}

/** The game clock of the application. */
export const gameClock = new GameClock()

// the stopwatches that count, warned when the page is hidden or shown again
const running = new Set()
const pageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { Stopwatch.visibilityChanged(pageHidden()) })
}

/**
 * The time spent on an activity, in milliseconds: real time, counted only while the page is visible. Switching to
 * another tab, minimising the window or locking the screen pauses it; it goes on when the page is shown again.
 *
 * The elapsed time can be saved (`elapsed`) and given back to a new stopwatch (`new Stopwatch({elapsed})`), for
 * instance to resume a game after a reload. `onPause` is called each time the page is hidden while the stopwatch
 * counts, the elapsed time being up to date: the place to save it (a reload hides the page first).
 *
 * ```js
 * const stopwatch = new Stopwatch({onPause: () => save(stopwatch.elapsed)})
 * stopwatch.start() // the first move
 * const seconds = Math.round(stopwatch.elapsed / 1000)
 * ```
 */
export class Stopwatch {
  #elapsed = 0 // the time counted before the current stretch
  #since = null // the start of the current stretch (running and page visible), or null
  #running = false
  #now
  #onPause

  /**
   * @param {object} [options]
   * @param {number} [options.elapsed] - The time already counted, in milliseconds (a saved stopwatch).
   * @param {Function} [options.onPause] - Called when the page is hidden while the stopwatch counts.
   * @param {Function} [options.now] - The clock, in milliseconds (by default `performance.now()`; tests give a fake).
   */
  constructor ({elapsed = 0, onPause = null, now = () => performance.now()} = {}) {
    this.#elapsed = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0
    this.#onPause = onPause
    this.#now = now
  }

  /** The time counted, in milliseconds. */
  get elapsed () { return this.#elapsed + (this.#since === null ? 0 : this.#now() - this.#since) }

  /** `true` between `start()` and `stop()`, even while the page is hidden. */
  get running () { return this.#running }

  /** Starts counting (nothing if already started). */
  start () {
    if (this.#running) { return }
    this.#running = true
    running.add(this)
    if (!pageHidden()) { this.#since = this.#now() }
  }

  /** Stops counting; the elapsed time is kept. */
  stop () {
    if (!this.#running) { return }
    this.#fold()
    this.#running = false
    running.delete(this)
  }

  /**
   * Stops and sets the elapsed time.
   * @param {number} [elapsed] - The new elapsed time, in milliseconds.
   */
  reset (elapsed = 0) {
    this.stop()
    this.#elapsed = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0
  }

  // the current stretch joins the elapsed time
  #fold () {
    if (this.#since === null) { return }
    this.#elapsed += this.#now() - this.#since
    this.#since = null
  }

  #visibility (hidden) {
    if (hidden) {
      if (this.#since === null) { return }
      this.#fold()
      this.#onPause?.()
    } else {
      this.#since ??= this.#now()
    }
  }

  /**
   * The page is hidden or shown again: every running stopwatch pauses or goes on. Called by the `visibilitychange`
   * listener of the module; kernel internal (tests call it).
   * @param {boolean} hidden - `true` if the page is now hidden.
   */
  static visibilityChanged (hidden) {
    for (const stopwatch of running) { stopwatch.#visibility(hidden) }
  }
}
