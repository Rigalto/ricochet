// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Pseudo-random numbers that can be replayed: the same seed gives the same sequence, on every browser. A game draws
 * the same world from the same seed; a test gets the same values at every run.
 *
 * The generator is **sfc32** (Chris Doty-Humphrey's Small Fast Counting generator): 128 bits of state, a period of
 * at least 2³², fast, and good statistical quality. It is not secure: for a password or a key, use
 * `crypto.getRandomValues()`.
 *
 * - **Instances.** `random` is the generator of the application, with a seed drawn by the browser at startup;
 *   `random.seed(value)` makes it replayable. A part of the application that must not depend on the other draws (a
 *   world generator) creates its own: `new Random('world-12')`.
 * - **Seeds.** A seed is an integer or a string (a string is hashed with `djb2`).
 * - **Ranges.** `int()` and `float()` accept the bounds, or an object `{min, max}`.
 * - **State.** `getState()` and `setState()` save and restore the position in the sequence (in a saved game).
 *
 * | Method | Result |
 * | --- | --- |
 * | `next()` | a number from 0 (included) to 1 (excluded) |
 * | `int(min, max)`, `int(max)` | an integer from `min` (0) to `max`, both included |
 * | `float(min, max)`, `float(max)` | a number from `min` (0) to `max` (excluded) |
 * | `bool(probability)` | `true` with the probability (0.5) |
 * | `pick(array)`, `index(array)` | an element, its index (`undefined` if the array is empty) |
 * | `weightedPick(items, weight)`, `weightedIndex(items, weight)` | an element, its index, each with the chance of its weight |
 * | `shuffle(array)` | the array itself, shuffled in place (Fisher–Yates) |
 * | `gaussian(mean, deviation)` | a number of normal distribution (Box–Muller) |
 * | `linear()` | a number from 0 to 1 whose density grows with the value: 0.9 comes nine times as often as 0.1 |
 *
 * ```javascript
 * import {random, Random} from 'ricochet/ricochet-utils.mjs'
 *
 * const damage = random.int(3, 8)
 * const loot = random.weightedPick([{name: 'gold', weight: 10}, {name: 'gem', weight: 1}])
 *
 * const world = new Random(seedOfTheWorld)
 * const height = world.float(20, 40)
 * ```
 *
 * The function `entropy(items, weight)` gives the entropy, in bits, of a set of weighted choices: 1 for two equal
 * choices, 0 for a choice made in advance.
 *
 * @module random
 */

import {djb2} from './hash.mjs'

const UINT32 = 4294967296

const defaultWeight = item => item?.weight ?? 1

// the bounds of int() and float(): (max), (min, max) or ({min, max})
const bounds = (a, b) => {
  if (a !== null && typeof a === 'object') { return [a.min, a.max] }
  return b === undefined ? [0, a] : [a, b]
}

/**
 * A generator of pseudo-random numbers.
 */
export class Random {
  #a = 0
  #b = 0
  #c = 0
  #d = 0

  /**
   * @param {number|string} [seed] - The seed; default: drawn by the browser (`Math.random()`).
   */
  constructor (seed) { this.seed(seed) }

  /**
   * Starts the sequence again from a seed.
   * @param {number|string} [seed] - An integer or a string; default: drawn by the browser.
   */
  seed (seed) {
    let s = seed === undefined ? Math.floor(Math.random() * UINT32) : typeof seed === 'string' ? djb2(seed) : seed >>> 0
    // the four words of the state are filled by splitmix32, so that close seeds give unrelated sequences
    const splitmix = () => {
      s = (s + 0x9e3779b9) | 0
      let z = s
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b)
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35)
      return (z ^ (z >>> 16)) >>> 0
    }
    this.#a = splitmix()
    this.#b = splitmix()
    this.#c = splitmix()
    this.#d = splitmix()
    for (let i = 0; i < 12; i++) { this.next() } // the first outputs of sfc32 are discarded
  }

  /**
   * The next number of the sequence.
   * @returns {number} A number from 0 (included) to 1 (excluded).
   */
  next () {
    const t = (((this.#a + this.#b) | 0) + this.#d) | 0
    this.#d = (this.#d + 1) | 0
    this.#a = this.#b ^ (this.#b >>> 9)
    this.#b = (this.#c + (this.#c << 3)) | 0
    this.#c = (this.#c << 21) | (this.#c >>> 11)
    this.#c = (this.#c + t) | 0
    return (t >>> 0) / UINT32
  }

  /**
   * An integer between two bounds, both included.
   * @param {number|{min: number, max: number}} a - The upper bound (the lower one is then 0), the lower bound, or
   *   both bounds.
   * @param {number} [b] - The upper bound.
   * @returns {number} An integer from `min` to `max`.
   */
  int (a, b) {
    const [min, max] = bounds(a, b)
    return Math.floor(min + this.next() * (max - min + 1))
  }

  /**
   * A number between two bounds, the upper one excluded.
   * @param {number|{min: number, max: number}} [a=1] - The upper bound (the lower one is then 0), the lower bound,
   *   or both bounds.
   * @param {number} [b] - The upper bound.
   * @returns {number} A number from `min` to `max`.
   */
  float (a = 1, b) {
    const [min, max] = bounds(a, b)
    return min + this.next() * (max - min)
  }

  /**
   * `true` with a given probability.
   * @param {number} [probability=0.5] - From 0 (never) to 1 (always).
   * @returns {boolean} The draw.
   */
  bool (probability = 0.5) { return this.next() < probability }

  /**
   * An index of an array.
   * @param {Array} array - The array.
   * @returns {number|undefined} An index, or `undefined` if the array is empty.
   */
  index (array) { return array.length === 0 ? undefined : Math.floor(this.next() * array.length) }

  /**
   * An element of an array.
   * @param {Array} array - The array.
   * @returns {*} An element, or `undefined` if the array is empty.
   */
  pick (array) { return array.length === 0 ? undefined : array[Math.floor(this.next() * array.length)] }

  /**
   * An index of an array, each element with the chance of its weight.
   * @param {Array} items - The elements.
   * @param {Function} [weight] - Gives the weight of an element; default: its `weight` property, or 1. A weight of
   *   0 or less is never drawn.
   * @returns {number|undefined} An index, or `undefined` if no element has a positive weight.
   */
  weightedIndex (items, weight = defaultWeight) {
    let total = 0
    for (const item of items) {
      const w = Number(weight(item))
      if (w > 0) { total += w }
    }
    if (!(total > 0)) { return undefined }
    let draw = this.next() * total
    let last
    for (let i = 0; i < items.length; i++) {
      const w = Number(weight(items[i]))
      if (!(w > 0)) { continue }
      last = i
      draw -= w
      if (draw < 0) { return i }
    }
    return last // rounding errors
  }

  /**
   * An element of an array, each with the chance of its weight (see `weightedIndex()`).
   * @param {Array} items - The elements.
   * @param {Function} [weight] - Gives the weight of an element; default: its `weight` property, or 1.
   * @returns {*} An element, or `undefined` if no element has a positive weight.
   */
  weightedPick (items, weight = defaultWeight) {
    const i = this.weightedIndex(items, weight)
    return i === undefined ? undefined : items[i]
  }

  /**
   * Shuffles an array in place (Fisher–Yates).
   * @param {Array} array - The array, changed.
   * @returns {Array} The same array.
   */
  shuffle (array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      const value = array[i]
      array[i] = array[j]
      array[j] = value
    }
    return array
  }

  /**
   * A number of normal distribution (Box–Muller).
   * @param {number} [mean=0] - Mean.
   * @param {number} [deviation=1] - Standard deviation.
   * @returns {number} The draw: 68 % of the draws are within one deviation of the mean.
   */
  gaussian (mean = 0, deviation = 1) {
    const u = 1 - this.next() // never 0
    const v = this.next()
    return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  /**
   * A number from 0 to 1 whose density grows linearly with the value.
   * @returns {number} The square root of a uniform draw.
   */
  linear () { return Math.sqrt(this.next()) }

  /**
   * The position in the sequence, to save it.
   * @returns {number[]} Four integers.
   */
  getState () { return [this.#a, this.#b, this.#c, this.#d] }

  /**
   * Goes back to a position saved by `getState()`.
   * @param {number[]} state - Four integers.
   */
  setState ([a, b, c, d]) {
    this.#a = a | 0
    this.#b = b | 0
    this.#c = c | 0
    this.#d = d | 0
  }
}

/** The generator of the application, seeded by the browser at startup. */
export const random = new Random()

/**
 * Entropy of a set of weighted choices, in bits.
 * @param {Array} items - The choices.
 * @param {Function} [weight] - Gives the weight of a choice; default: its `weight` property, or 1. A weight of 0
 *   or less does not count.
 * @returns {number} 0 for a single possible choice, 1 for two equal choices, log2(n) for n equal choices.
 */
export const entropy = (items, weight = defaultWeight) => {
  const weights = items.map(item => Number(weight(item))).filter(w => w > 0)
  const total = weights.reduce((sum, w) => sum + w, 0)
  return weights.reduce((sum, w) => {
    const p = w / total
    return sum - p * Math.log2(p)
  }, 0) + 0 // + 0: no -0
}
