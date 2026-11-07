// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The changes not saved yet in a remote store (Google Drive, Google Tasks, a server…): each adapter that keeps changes
 * before it sends them reports how many it holds and what it is doing; the kernel adds them up and announces the
 * total by one event. The application shows it — a badge, a « Saving… » text — so that the user knows when
 * everything is saved, and can close the page.
 *
 * ```javascript
 * import {pendingWrites} from 'ricochet/ricochet.mjs'
 *
 * pendingWrites.report('config', {count: 2, state: 'queued'}) // by an adapter
 * bus.on('pendingChanged', ({total, state}) => { … })          // by the application
 * ```
 *
 * ## The states
 *
 * | State | Meaning |
 * | --- | --- |
 * | `idle` | nothing waits: everything is saved |
 * | `queued` | changes wait a few seconds, then are sent (several changes go together) |
 * | `saving` | changes are being sent |
 * | `offline` | changes wait for a connection (the account is not connected, or its token expired) |
 * | `error` | the last sending failed (network, remote store); it is tried again later |
 *
 * The state of the whole is the most serious state of the sources: `error`, then `offline`, `saving`, `queued`,
 * `idle`. A source with no change is `idle`, whatever it says.
 *
 * @module pending
 * @fires pendingChanged - `{total, state, sources, savedAt}`: what waits changed.
 */

import {bus} from './bus.mjs'

const ORDER = ['idle', 'queued', 'saving', 'offline', 'error']

/**
 * The register of the changes not saved yet. The application uses the `pendingWrites` instance.
 */
export class PendingWrites {
  #sources = new Map() // source → {count, state}
  #savedAt = 0

  /**
   * Reports what a source holds. An event `pendingChanged` is emitted when the total, the state of the whole, or the
   * state of the source changes.
   * @param {string} source - The name of the source (`config`, `cards`, `tasks`…).
   * @param {{count: number, state: string}} report - The number of changes that wait, and the state of the source
   *   (`idle`, `queued`, `saving`, `offline`, `error`); `saved: true` when a sending just succeeded.
   * @fires pendingChanged
   */
  report (source, {count = 0, state = 'idle', saved = false} = {}) {
    const next = {count: Math.max(0, count), state: count === 0 ? 'idle' : ORDER.includes(state) && state !== 'idle' ? state : 'queued'}
    const before = this.#sources.get(source)
    if (saved) { this.#savedAt = Date.now() }
    if (before !== undefined && before.count === next.count && before.state === next.state && !saved) { return }
    this.#sources.set(source, next)
    bus.emit('pendingChanged', this.summary)
  }

  /** The number of changes that wait, all sources together. */
  get total () { return [...this.#sources.values()].reduce((sum, {count}) => sum + count, 0) }

  /** The state of the whole: the most serious state of the sources. */
  get state () {
    return [...this.#sources.values()].reduce((worst, {state}) => ORDER.indexOf(state) > ORDER.indexOf(worst) ? state : worst, 'idle')
  }

  /** The time of the last sending that succeeded (milliseconds since 1970), or `0`. */
  get savedAt () { return this.#savedAt }

  /** `{total, state, sources: {source: {count, state}}, savedAt}`: the payload of `pendingChanged`. */
  get summary () {
    return {total: this.total, state: this.state, sources: Object.fromEntries([...this.#sources].map(([name, s]) => [name, {...s}])), savedAt: this.#savedAt}
  }
}

/** The register of the changes not saved yet. */
export const pendingWrites = new PendingWrites()
