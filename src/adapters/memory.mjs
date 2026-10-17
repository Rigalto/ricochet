// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A storage adapter that keeps the configuration items in memory: nothing survives a reload of the page. Useful for
 * tests, demonstrations, and applications that need no persistence.
 *
 * ```javascript
 * import {config} from 'ricochet/core/config.mjs'
 * import {MemoryAdapter} from 'ricochet/adapters/memory.mjs'
 *
 * config.setAdapter(new MemoryAdapter({theme: 'dark'}))
 * await config.load()
 * ```
 *
 * @module memory
 * @category adapters
 */

/**
 * Storage adapter for `config`, in memory.
 */
export class MemoryAdapter {
  /**
   * @param {object} [items] - Initial items, as `{item: value, …}`.
   */
  constructor (items = {}) {
    /** The stored items, as `{item: value, …}`. */
    this.items = {...items}
  }

  /**
   * @returns {Promise<object>} A copy of every item.
   */
  async load () { return {...this.items} }

  /**
   * @param {Array<{item: string, value: string}>} entries - The items to store.
   */
  async save (entries) {
    for (const {item, value} of entries) { this.items[item] = value }
  }

  /**
   * @param {string[]} items - The names of the items to delete.
   */
  async remove (items) {
    for (const item of items) { delete this.items[item] }
  }
}
