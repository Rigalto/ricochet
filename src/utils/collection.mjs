// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Functions on objects, arrays and sets, for the cases the language does not cover.
 *
 * | Function | Result |
 * | --- | --- |
 * | `clearObject(object)` | the object emptied in place: those who hold it see it empty |
 * | `removeWhere(array, predicate)` | the matching elements removed in place, fast, without keeping the order |
 * | `removeUnordered(array, element)` | one element removed in place, fast, without keeping the order |
 * | `firstOf(iterable)` | the first element of a set, a map or any iterable |
 *
 * **Removing without keeping the order.** The element removed is replaced by the last one of the array: nothing is
 * moved, nothing is allocated. On a large array, it is several times as fast as `filter()` or `splice()`; use it
 * for lists whose order does not matter (the particles of a game, the entities of a world).
 *
 * The language already gives the rest:
 *
 * | Need | Native |
 * | --- | --- |
 * | a deep copy | `structuredClone(value)` (functions and DOM nodes are not copied) |
 * | a shallow copy | `{...object}`, `[...array]` |
 * | an array sorted, reversed or changed, without changing the original | `toSorted()`, `toReversed()`, `with()` |
 * | groups | `Object.groupBy(items, fn)`, `Map.groupBy(items, fn)` |
 *
 * @module collection
 */

/**
 * Deletes every own property of an object, in place.
 * @param {object} object - The object, emptied.
 * @returns {object} The same object.
 */
export const clearObject = object => {
  for (const key of Object.keys(object)) { delete object[key] }
  return object
}

/**
 * Removes in place the elements of an array that match a predicate; the order of the others is not kept.
 * @param {Array} array - The array, changed.
 * @param {Function} predicate - `(element) => boolean`: `true` to remove the element.
 * @returns {number} The number of elements removed.
 */
export const removeWhere = (array, predicate) => {
  let last = array.length - 1
  const length = array.length
  for (let i = last; i >= 0; i--) {
    if (predicate(array[i])) {
      array[i] = array[last]
      last--
    }
  }
  array.length = last + 1
  return length - array.length
}

/**
 * Removes in place one element of an array, by putting the last element in its place.
 * @param {Array} array - The array, changed.
 * @param {*} element - The element (its first occurrence).
 * @returns {boolean} `true` if the element was found and removed.
 */
export const removeUnordered = (array, element) => {
  const index = array.indexOf(element)
  if (index === -1) { return false }
  array[index] = array[array.length - 1]
  array.length--
  return true
}

/**
 * The first element of an iterable.
 * @param {Iterable} iterable - A set, a map (its first entry), an array…
 * @returns {*} The first element, or `undefined` if it is empty.
 */
export const firstOf = iterable => {
  if (iterable === null || iterable === undefined) { return undefined }
  return iterable[Symbol.iterator]().next().value
}
