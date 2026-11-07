// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The sounds of a game, with the Web Audio API: each file is loaded and decoded once for the page, then played as
 * often as needed, several at the same time, without any pool of `<audio>` elements to size.
 *
 * ```javascript
 * import {SoundBank} from 'ricochet/ricochet-utils.mjs'
 *
 * const sounds = new SoundBank({shot: '/assets/game/shot.wav', boom: '/assets/game/boom.mp3'})
 * sounds.load()                    // at once: the sounds are ready when the game needs them
 * startButton.onclick = () => {
 *   sounds.unlock()                // in a click: the browser allows the sound from now on
 *   …
 * }
 * sounds.play('shot', {volume: 0.8})
 * sounds.muted = true              // the sound setting of the game
 *
 * const music = new SoundBank({theme: '/assets/game/theme.mp3'})  // its own bank: its own setting
 * const playing = music.play('theme', {loop: true, volume: 0.5})   // until stopped
 * playing?.stop()                                                   // the pause of the game
 * ```
 *
 * - **Loading.** `load()` fetches and decodes every file; a file shared by several banks, or a bank created again
 *   (the view of the game mounted again), is not fetched twice. A sound not loaded yet, or that could not be loaded,
 *   is silent: the game never waits for its sounds.
 * - **The first click.** A browser plays no sound before a gesture of the user: `unlock()`, called in a click (the
 *   one that starts the game), allows them for the whole page.
 * - **One audio context** for the page, created at the first need.
 * - **Music.** `play(name, {loop: true})` repeats the sound until it is stopped: by the object it returns, or by
 *   `stop()` (every sound of the bank). A bank of its own for the music gives it a setting of its own (`muted`); the
 *   game stops the music when it is muted or paused, and plays it again (from the start) afterwards.
 *
 * @module sound
 */

let sharedContext = null
const buffers = new Map() // address → Promise<AudioBuffer|null>, for the page

const audioContext = () => {
  if (sharedContext === null) {
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext
    if (Context === undefined) { return null }
    sharedContext = new Context()
  }
  return sharedContext
}

/**
 * Sounds that can be played by name.
 */
export class SoundBank {
  #sources
  #context
  #decoded = new Map() // name → AudioBuffer
  #playing = new Set()
  #cache

  /**
   * @param {Object<string, string>} sources - `{name: address}`.
   * @param {object} [options]
   * @param {AudioContext} [options.context] - The audio context (default: the one of the page); for the tests.
   * @param {Map} [options.cache] - The decoded sounds, shared by address (default: the cache of the page); for the
   *   tests.
   */
  constructor (sources, {context, cache = buffers} = {}) {
    this.#sources = {...sources}
    this.#context = context ?? null
    this.#cache = cache
    /** No sound is played while `true` (the sound setting of the game). */
    this.muted = false
  }

  /** The names of the sounds ready to be played. */
  get loaded () { return [...this.#decoded.keys()] }

  /**
   * Loads and decodes every sound (once for the page).
   * @returns {Promise<void>} Resolved when every sound is loaded, or could not be (a warning in the console).
   */
  async load () {
    const context = this.#audio()
    if (context === null) { return }
    await Promise.all(Object.entries(this.#sources).map(async ([name, src]) => {
      if (!this.#cache.has(src)) {
        this.#cache.set(src, fetch(src)
          .then(response => {
            if (!response.ok) { throw new Error(`HTTP ${response.status}`) }
            return response.arrayBuffer()
          })
          .then(data => context.decodeAudioData(data))
          .catch(error => {
            console.warn(`SoundBank: the sound cannot be loaded: ${src}`, error.message)
            return null
          }))
      }
      const buffer = await this.#cache.get(src)
      if (buffer !== null) { this.#decoded.set(name, buffer) }
    }))
  }

  /**
   * Allows the sound: to call in the handler of a click (the browser plays nothing before a gesture of the user).
   */
  unlock () {
    const context = this.#audio()
    if (context?.state === 'suspended') { context.resume().catch(() => {}) }
  }

  /**
   * Plays a sound (nothing when muted, or when the sound is not loaded).
   * @param {string} name - The name of the sound.
   * @param {object} [options]
   * @param {number} [options.volume] - The volume, from 0 to 1 (default 1).
   * @param {boolean} [options.loop] - Repeats the sound until it is stopped (default `false`): a music.
   * @returns {{stop: Function}|null} The sound being played, to stop it; `null` when nothing is played.
   */
  play (name, {volume = 1, loop = false} = {}) {
    const buffer = this.#decoded.get(name)
    const context = this.#context
    if (this.muted || buffer === undefined || context === null) { return null }
    if (context.state === 'suspended') { context.resume().catch(() => {}) }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.loop = loop
    const gain = context.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(context.destination)
    this.#playing.add(source)
    source.onended = () => this.#playing.delete(source)
    source.start()
    return {
      stop: () => {
        try { source.stop() } catch { /* already stopped */ }
        this.#playing.delete(source)
      }
    }
  }

  /** Stops the sounds being played by this bank. */
  stop () {
    for (const source of this.#playing) {
      try { source.stop() } catch { /* already stopped */ }
    }
    this.#playing.clear()
  }

  #audio () {
    this.#context ??= audioContext()
    return this.#context
  }
}
