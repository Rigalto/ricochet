// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The store of configuration items used by the kernel (`observeItems()`, `setItem()`, the keyboard…). Items are
 * shared, persistent key/value pairs; the store loads them, saves them and calls their observers. Ricochet's own
 * store, `config` (see the `config` module), registers itself when it is imported; an application may register
 * another store instead.
 *
 * A store is an object with four methods:
 *
 * | Method | Role |
 * | --- | --- |
 * | `addObserver(items, recall)` | calls `recall({item: value, …})` now and whenever one of the items changes; returns an id |
 * | `removeObserver(id)` | stops that observation |
 * | `setItem(item, value)` | changes an item |
 * | `setItemIfValue(item, expected, value)` | changes an item only if its current value is `expected` |
 *
 * ```js
 * import {setItemStore} from 'ricochet/core/items.mjs'
 * setItemStore(myStore)
 * ```
 *
 * @module items
 */

let store = null

/**
 * Registers the store of configuration items. Called once, at startup.
 * @param {object} itemStore - An object with the four methods described above.
 */
export const setItemStore = itemStore => { store = itemStore }

/**
 * The registered store.
 * @returns {object} The store given to `setItemStore()`.
 */
export const itemStore = () => {
  if (store === null) { throw new Error('No store of configuration items: import ricochet/core/config.mjs, or call setItemStore()') }
  return store
}
