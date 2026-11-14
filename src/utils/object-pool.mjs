// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A pool of objects: many short-lived objects (particles, bullets, sparks) are taken from the pool and given back to
 * it, instead of being created and left to the garbage collector. No object is destroyed, so the collector does not
 * run in the middle of an animation, and creating an object costs nothing once the pool is warm.
 *
 * ```javascript
 * import {ObjectPool} from 'ricochet/ricochet-utils.mjs'
 *
 * const sparks = new ObjectPool(200, () => new Spark(), {name: 'sparks'})  // 200 sparks created at once
 * const spark = sparks.use()                               // a free spark, now in use
 * spark.create(x, y)                                       // set ALL its attributes: it may have been used before
 * sparks.forEach(s => {
 *   s.move()
 *   if (s.dead) { sparks.recycle(s) }                      // allowed for the current object
 * })
 * ```
 *
 * ## One array
 *
 * The pool keeps all its objects in one array: those in use first, then the free ones. `use()` takes the first free
 * object, `recycle()` swaps the object with the last one in use, `clear()` only resets a counter: all constant time,
 * and the walk reads a dense array, without following links from object to object. The pool adds one attribute to
 * each object, `_slot` (its place in the array): the application must neither change nor delete it.
 *
 * ## The walk
 *
 * `forEach`, `reduce` and `map` walk the objects in use from the last to the first. The callback may recycle the
 * current object (the object that takes its place has already been walked), and may take new objects (they are not
 * walked). It must not recycle another object. The order changes with the recycling: it means nothing.
 *
 * ## The objects
 *
 * The second argument of the constructor gives the objects:
 *
 * - **a function** that returns a new object, usually an instance of a class (`() => new Spark()`): the constructor
 *   creates every attribute, so that none is added later;
 * - **an object**, copied for each new object: its attributes are copied, and an attribute that is itself an object
 *   is copied one level down (with its `clone()` method when it has one).
 *
 * An object taken by `use()` keeps the values of its previous use: the application sets them all, usually with a
 * `create(…)` method. `new Spark(x, y)` becomes `pool.use().create(x, y)`.
 *
 * ## The size
 *
 * The pool creates `count` objects at once; when they are all in use, `use()` creates one more. The pool never
 * shrinks. `length` (in use) and `size` (created) help to choose `count`, and to find objects never given back: an
 * object that is not recycled is never collected either. With a `name`, the pool warns in the console when it grows
 * past `count`, then at each doubling: the warning says which `count` to give.
 *
 * ## Finding an object
 *
 * The pool is walked, not searched. To find an object by its key, keep a `Map` beside the pool: add the object after
 * `use()`, delete it before `recycle()`.
 *
 * @module object-pool
 */

/**
 * A pool of reusable objects.
 */
export class ObjectPool {
  #items = [] // [0, length): in use; [length, size): free
  #length = 0
  #warnAt // the size from which the next growth is reported

  /**
   * @param {number} count - The number of objects created at once (at least 1).
   * @param {Function|object} template - A function that returns a new object, or an object to copy.
   * @param {object} [options]
   * @param {string} [options.name] - The name of the pool: it then warns in the console when it grows past `count`.
   */
  constructor (count, template, {name = ''} = {}) {
    if (!Number.isInteger(count) || count <= 0) { throw new Error('ObjectPool: "count" must be a positive integer') }
    if (template === null || (typeof template !== 'object' && typeof template !== 'function')) {
      throw new Error('ObjectPool: "template" must be a function or an object')
    }
    this.template = template
    this.name = name
    this.#warnAt = count
    for (let i = 0; i < count; i++) { this.#allocate() }
  }

  /** The number of objects in use. */
  get length () { return this.#length }

  /** The number of objects created (in use and free). */
  get size () { return this.#items.length }

  #allocate () {
    const obj = typeof this.template === 'function' ? this.template() : this.#copy(this.template)
    obj._slot = this.#items.length
    this.#items.push(obj)
  }

  #copy (template) {
    const copy = {}
    for (const key in template) {
      const value = template[key]
      copy[key] = typeof value === 'object' && value !== null
        ? (typeof value.clone === 'function' ? value.clone() : (Array.isArray(value) ? [...value] : {...value}))
        : value
    }
    return copy
  }

  /**
   * Takes a free object (created if none is free) and puts it in use. Its attributes keep their previous values: set
   * them all.
   * @returns {object} The object.
   */
  use () {
    if (this.#length === this.#items.length) {
      this.#allocate()
      if (this.name !== '' && this.#items.length > this.#warnAt) {
        console.warn(`ObjectPool "${this.name}": ${this.#items.length} objects, more than the ${this.#warnAt} expected`)
        this.#warnAt *= 2
      }
    }
    return this.#items[this.#length++]
  }

  /**
   * Gives an object back: it is free again, for a next `use()`. Allowed for the current object of a walk.
   * @param {object} obj - An object in use, taken from this pool.
   */
  recycle (obj) {
    const items = this.#items
    const slot = obj._slot
    if (slot >= this.#length || items[slot] !== obj) { return } // free already, or not from this pool
    const last = items[this.#length - 1]
    items[slot] = last
    last._slot = slot
    items[this.#length - 1] = obj
    obj._slot = this.#length - 1
    this.#length -= 1
  }

  /** Gives all the objects back. */
  clear () { this.#length = 0 }

  /**
   * Calls `callback` for each object in use, from the last to the first; the callback may recycle the current object.
   * @param {(obj: object) => void} callback - For each object.
   */
  forEach (callback) {
    const items = this.#items
    for (let i = Math.min(this.#length, items.length) - 1; i >= 0; i--) {
      if (i < this.#length) { callback(items[i]) }
    }
  }

  /**
   * Reduces the objects in use to one value, as `Array.prototype.reduce`.
   * @param {(accumulator: *, obj: object) => *} callback - Gives the new value of the accumulator.
   * @param {*} initial - The first value of the accumulator.
   * @returns {*} The last value of the accumulator.
   */
  reduce (callback, initial) {
    let accumulator = initial
    this.forEach(obj => { accumulator = callback(accumulator, obj) })
    return accumulator
  }

  /**
   * The objects in use in an array, or what `callback` returns for each.
   * @param {(obj: object) => *} [callback] - For each object.
   * @returns {Array} The array.
   */
  map (callback) {
    const array = []
    this.forEach(obj => array.push(callback === undefined ? obj : callback(obj)))
    return array
  }
}
