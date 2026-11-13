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
 * const sparks = new ObjectPool(200, () => new Spark())   // 200 sparks created at once
 * const spark = sparks.use()                               // a free spark, now in use
 * spark.create(x, y)                                       // set ALL its attributes: it may have been used before
 * sparks.forEach(s => {
 *   s.move()
 *   if (s.dead) { sparks.recycle(s) }                      // allowed while walking the pool
 * })
 * ```
 *
 * ## The two lists
 *
 * The pool keeps the free objects in a singly linked list, and the objects in use in a doubly linked list: `use()`,
 * `recycle()` and the walk are constant time per object, without arrays to shift. The pool adds two attributes to
 * each object, `_next` and `_previous`: the application must neither change nor delete them.
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
 * object that is not recycled is never collected either.
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
  #length = 0
  #size = 0

  /**
   * @param {number} count - The number of objects created at once (at least 1).
   * @param {Function|object} template - A function that returns a new object, or an object to copy.
   */
  constructor (count, template) {
    if (!Number.isInteger(count) || count <= 0) { throw new Error('ObjectPool: "count" must be a positive integer') }
    if (template === null || (typeof template !== 'object' && typeof template !== 'function')) {
      throw new Error('ObjectPool: "template" must be a function or an object')
    }
    this.template = template
    this.headFree = null // the free objects (singly linked by _next)
    this.headUsed = null // the objects in use (doubly linked by _next and _previous)
    for (let i = 0; i < count; i++) { this.#allocate() }
  }

  /** The number of objects in use. */
  get length () { return this.#length }

  /** The number of objects created (in use and free). */
  get size () { return this.#size }

  #allocate () {
    const obj = typeof this.template === 'function' ? this.template() : this.#copy(this.template)
    obj._previous = null
    obj._next = this.headFree
    this.headFree = obj
    this.#size += 1
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
    if (this.headFree === null) { this.#allocate() }
    const obj = this.headFree
    this.headFree = obj._next
    obj._previous = null
    obj._next = this.headUsed
    if (this.headUsed !== null) { this.headUsed._previous = obj }
    this.headUsed = obj
    this.#length += 1
    return obj
  }

  /**
   * Gives an object back: it is free again, for a next `use()`. Allowed while walking the pool.
   * @param {object} obj - An object in use, taken from this pool.
   */
  recycle (obj) {
    if (obj._previous !== null) { obj._previous._next = obj._next }
    if (obj._next !== null) { obj._next._previous = obj._previous }
    if (this.headUsed === obj) { this.headUsed = obj._next }
    obj._previous = null
    obj._next = this.headFree
    this.headFree = obj
    this.#length -= 1
  }

  /** Gives all the objects back. */
  clear () {
    let obj = this.headUsed
    while (obj !== null) {
      const next = obj._next
      obj._previous = null
      obj._next = this.headFree
      this.headFree = obj
      obj = next
    }
    this.headUsed = null
    this.#length = 0
  }

  /**
   * Calls `callback` for each object in use (in no particular order); the callback may recycle the object.
   * @param {(obj: object) => void} callback - For each object.
   */
  forEach (callback) {
    let obj = this.headUsed
    while (obj !== null) {
      const next = obj._next
      callback(obj)
      obj = next
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
