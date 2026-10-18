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
