// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Short unique identifiers, made of lowercase letters: `'aa'`, `'ab'`… `'az'`, `'ba'`… They are cheap to make (no
 * random draw, no clock) and short to store, which suits the records of an application or the entities of a game.
 *
 * An identifier is a **seed** followed by a **suffix**. The suffix goes from `a` to `z`; then the seed moves on, in
 * base 26 (`a`… `z`, `aa`, `ab`…), and the suffix starts again at `a`.
 *
 * - **Kept from one session to the next.** With an `item`, the seed is a configuration item (see the `config`
 *   module): it is written once every 26 identifiers only, and the generator takes the next seed when the page is
 *   loaded again, so that an identifier is not given twice. The items must be loaded before the first identifier
 *   (`await config.load()`). The item is saved as any other one: 2 seconds after the change, or when the page is
 *   hidden; only a crash of the browser in those 2 seconds could give the same identifiers again.
 * - **For the session only.** Without an item, the identifiers start again at each loading of the page; `uniqueId()`
 *   uses such a generator.
 * - **Prefix.** A `prefix` makes the identifiers of two generators different: `'note-ab'`, `'task-ab'`.
 *
 * ```javascript
 * import {createIdGenerator, uniqueId} from 'ricochet/ricochet-utils.mjs'
 *
 * const recordIds = createIdGenerator({item: 'app-record-seed'}) // after config.load()
 * const record = {id: recordIds.next(), title: 'New note'}
 *
 * element.id = `field-${uniqueId()}` // unique within the page
 * ```
 *
 * `crypto.randomUUID()` gives identifiers unique across computers, but longer (36 characters) and slower to make:
 * keep it for data written by several computers at the same time.
 *
 * @module id
 */

import {config} from '../core/config.mjs'

// the next seed, in base 26: '' → 'a', 'z' → 'aa', 'az' → 'ba'
const nextSeed = seed => {
  const chars = seed.split('')
  let i = chars.length - 1
  while (i >= 0) {
    if (chars[i] === 'z') {
      chars[i] = 'a'
      i--
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1)
      break
    }
  }
  if (i < 0) { chars.unshift('a') }
  return chars.join('')
}

/**
 * A generator of unique identifiers.
 */
export class IdGenerator {
  #item
  #store
  #prefix
  #seed = null
  #suffix = 'z'

  /**
   * @param {{item: string, store: object, prefix: string}} [options] - `item`: the configuration item that keeps the
   *   seed; none for identifiers of the session only. `store`: the store of the item, default `config`. `prefix`:
   *   written before each identifier.
   */
  constructor ({item = null, store = config, prefix = ''} = {}) {
    this.#item = item
    this.#store = store
    this.#prefix = prefix
  }

  /**
   * A new identifier.
   * @returns {string} The prefix, the seed and the suffix: `'ba'`, `'note-bza'`.
   */
  next () {
    if (this.#seed === null || this.#suffix === 'z') {
      this.#moveSeed()
    } else {
      this.#suffix = String.fromCharCode(this.#suffix.charCodeAt(0) + 1)
    }
    return this.#prefix + this.#seed + this.#suffix
  }

  // the first time, the seed after the saved one: the suffixes given after it are not known
  #moveSeed () {
    let seed = this.#seed
    if (seed === null && this.#item !== null) {
      if (!this.#store.loaded) { console.error(`IdGenerator: the items are not loaded, '${this.#item}' cannot be read`) }
      seed = this.#store.get(this.#item) ?? null
      if (seed !== null && !/^[a-z]+$/.test(seed)) {
        console.error(`IdGenerator: '${this.#item}' holds '${seed}', which is not a seed: it starts again`)
        seed = null
      }
    }
    this.#seed = nextSeed(seed ?? '')
    this.#suffix = 'a'
    if (this.#item !== null && this.#store.loaded) { this.#store.setItem(this.#item, this.#seed) }
  }
}

/**
 * Creates a generator of unique identifiers.
 * @param {{item: string, store: object, prefix: string}} [options] - See `IdGenerator`.
 * @returns {IdGenerator} The generator: `next()` gives an identifier.
 */
export const createIdGenerator = options => new IdGenerator(options)

const session = new IdGenerator()

/**
 * An identifier unique within the page, until it is loaded again.
 * @returns {string} `'aa'`, `'ab'`…
 */
export const uniqueId = () => session.next()
