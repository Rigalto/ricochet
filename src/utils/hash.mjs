// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Hashes of texts and data.
 *
 * | Function | Result | Use |
 * | --- | --- | --- |
 * | `djb2(text)` | an integer from 0 to 2³² - 1 | a quick key for a cache, a seed for `Random` |
 * | `djb2String(text)` | a short string of letters and digits (about 12 characters) | a key with fewer collisions |
 * | `sha256(data)` | a promise of 64 hexadecimal characters | to compare two versions of a file, to check a download |
 *
 * `djb2` (Daniel J. Bernstein) is fast but not secure: two texts may share a hash, and a hash is easy to forge. Use
 * `sha256()` (the Web Crypto API of the browser) when that matters.
 *
 * ```javascript
 * import {djb2, sha256} from 'ricochet/ricochet-utils.mjs'
 *
 * const key = djb2(url)
 * if (await sha256(newText) !== savedHash) { save(newText) }
 * ```
 *
 * @module hash
 */

/**
 * Hash djb2 (xor variant) of a text.
 * @param {string} text - The text.
 * @returns {number} An integer from 0 to 4 294 967 295.
 */
export const djb2 = text => {
  let h = 5381
  for (let i = 0; i < text.length; i++) { h = Math.imul(h, 33) ^ text.charCodeAt(i) }
  return h >>> 0
}

/**
 * Two djb2 hashes of a text (its even and its odd characters), written in base 36: fewer collisions than `djb2()`.
 * @param {string} text - The text.
 * @returns {string} A string of letters and digits, at most 14 characters.
 */
export const djb2String = text => {
  let even = 5381
  let odd = 5381
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    if (i & 1) { odd = Math.imul(odd, 33) ^ c } else { even = Math.imul(even, 33) ^ c }
  }
  return (odd >>> 0).toString(36) + (even >>> 0).toString(36)
}

/**
 * SHA-256 hash, with the Web Crypto API.
 * @param {string|ArrayBuffer|ArrayBufferView} data - A text (encoded in UTF-8) or binary data.
 * @returns {Promise<string>} The hash, in 64 lowercase hexadecimal characters.
 */
export const sha256 = async data => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}
