// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * An image that has no address the browser can load: a file of Google Drive read with a token, an image kept in
 * IndexedDB, a file dropped by the user and not yet sent. A named **source** gives the image of a reference, as a
 * `Blob` (or an address); the component shows it through a local address (`URL.createObjectURL()`), and frees that
 * address when no image uses it any more.
 *
 * ```js
 * import {defineImageSources} from 'ricochet/ui/rc-image.mjs'
 *
 * defineImageSources({
 *   drive: {load: path => findFile(path).then(id => googleAccount.request(`${FILES}/${id}`, {query: {alt: 'media'}, answer: 'blob'}))}
 * })
 * ```
 *
 * ```html
 * <rc-image source="drive" ref="kitchen/plan.png" alt="Plan of the kitchen" width="300"></rc-image>
 * ```
 *
 * With the `image` option of `markdownToHtml()` (see the `markdown` module), the relative images of a Markdown text
 * become `rc-image` elements.
 *
 * ## Sources
 *
 * `defineImageSources({name: source})` declares sources; a source declared again replaces the former one. A source is
 * `{load: (ref, element) => …}`, or the function alone. It returns, or resolves to:
 *
 * | Answer | Shown |
 * | --- | --- |
 * | a `Blob` (a `File`) | through a local address, freed when it is no longer used |
 * | a string | used as the address of the image (`https:`, `data:`, `blob:`…) |
 * | `null`, `undefined`, an error | no image: the `alt` text |
 *
 * ## Cache
 *
 * The images of the same source and reference share one request and one local address. When no element shows an
 * image any more, its address is kept a while, among the last unused ones, so that a page shown again does not ask
 * for it again; the oldest are freed. `forgetImages(name, ref)` drops the images of a source (of one reference, when
 * given), when they changed: the elements that show them ask for them again.
 *
 * ## Look
 *
 * The element is `inline-block`, holding an `<img>` no wider than its container. While the image loads, it has the
 * `loading` attribute (a light box of the requested size); when the image is missing, the `failed` attribute and the
 * `alt` text, in italics. `width` and `height` are pixels (`300`, `300px`) or, for `width`, a percentage of the
 * container (`50%`).
 *
 * @module rc-image
 * @category ui
 */

import {WComponent} from '../core/w-component.mjs'
import {css} from '../core/css.mjs'

css(`
rc-image { vertical-align: middle; max-width: 100%; }
rc-image > img { display: block; max-width: 100%; height: auto; }
rc-image[loading] { min-width: var(--rc-image-width, 2em); min-height: var(--rc-image-height, 2em); border-radius: .25em; background: color-mix(in srgb, currentColor 8%, transparent); }
rc-image[failed] > span { font-style: italic; opacity: .7; }
`, {layer: 'ricochet'})

const KEEP = 32 // unused local addresses kept, the most recent ones
const sources = new Map()
const warned = new Set()
const entries = new Map() // `${name} ${ref}` → {promise, url, blob, users}
const unused = [] // keys of the entries that no element uses, the oldest first
const shown = new Set() // the components in the page

/**
 * Declares named sources of images.
 * @param {Object<string, object|Function>} definitions - `{name: {load: (ref, element) => …}}`, or `{name: load}`.
 */
export function defineImageSources (definitions) {
  for (const [name, definition] of Object.entries(definitions)) {
    const load = typeof definition === 'function' ? definition : definition?.load
    if (typeof load !== 'function') {
      console.error(`defineImageSources: the source '${name}' has no load function`)
      continue
    }
    sources.set(name, {load})
    warned.delete(name)
  }
}

/**
 * Drops the images of a source, or of one of its references: the elements that show them ask for them again.
 * @param {string} name - The source.
 * @param {string} [ref] - The reference; all the references of the source when it is not given.
 */
export function forgetImages (name, ref) {
  const prefix = `${name} `
  const match = key => ref === undefined ? key.startsWith(prefix) : key === `${name} ${ref}`
  for (const [key, entry] of entries) {
    if (!match(key)) { continue }
    entries.delete(key)
    const index = unused.indexOf(key)
    if (index !== -1) { unused.splice(index, 1) }
    if (entry.blob) { URL.revokeObjectURL(entry.url) }
  }
  for (const component of shown) {
    if (component.key !== null && match(component.key)) { component.reload() }
  }
}

// the entry of an image, asked to its source when it is not known
const take = (name, ref, element) => {
  const key = `${name} ${ref}`
  let entry = entries.get(key)
  if (entry === undefined) {
    let promise
    try {
      promise = Promise.resolve(sources.get(name).load(ref, element))
    } catch (error) {
      promise = Promise.reject(error)
    }
    entry = {users: 0, url: null, blob: false}
    entry.promise = promise.then(answer => {
      if (entries.get(key) !== entry) { return null } // forgotten meanwhile
      if (answer instanceof Blob) {
        entry.url = URL.createObjectURL(answer)
        entry.blob = true
      } else if (typeof answer === 'string' && answer !== '') {
        entry.url = answer
      } else {
        entries.delete(key) // nothing: asked again next time
      }
      return entry.url
    }, error => {
      if (entries.get(key) === entry) { entries.delete(key) }
      console.warn(`rc-image: the source '${name}' failed for '${ref}'`, error)
      return null
    })
    entries.set(key, entry)
  }
  const index = unused.indexOf(key)
  if (index !== -1) { unused.splice(index, 1) }
  entry.users += 1
  return entry
}

// an element no longer shows the image: the entry joins the unused ones, the oldest beyond KEEP are freed
const release = key => {
  const entry = entries.get(key)
  if (entry === undefined) { return }
  entry.users -= 1
  if (entry.users > 0) { return }
  unused.push(key)
  while (unused.length > KEEP) {
    const old = unused.shift()
    const dropped = entries.get(old)
    entries.delete(old)
    if (dropped?.blob) { URL.revokeObjectURL(dropped.url) }
  }
}

/**
 * The component of `<rc-image>`.
 * @attr {string} source - The name of the source (`defineImageSources()`).
 * @attr {string} ref - The reference of the image in the source.
 * @attr {string} [alt] - The text of the image, shown when it is missing.
 * @attr {string} [width] - The width: pixels (`300`, `300px`) or a percentage of the container (`50%`).
 * @attr {string} [height] - The height, in pixels.
 */
export class RcImage extends WComponent {
  static observedAttributes = ['alt', 'width', 'height', 'source', 'ref']
  static display = 'inline-block'

  attach () {
    this.key = null // the image shown: `${source} ${ref}`
    this.request = 0 // the last request: the answers of the former ones are ignored
    this.planned = false
    this.elImage = document.createElement('img')
    this.elImage.decoding = 'async'
    this.element.replaceChildren()
    shown.add(this)
  }

  detach () {
    shown.delete(this)
    if (this.key !== null) { release(this.key) }
    this.key = null
  }

  // ------------------------------------------------------------------ attributes

  altChanged (value) {
    this.elImage.alt = value ?? ''
    if (this.element.hasAttribute('failed')) { this.#fail() }
  }

  widthChanged (value) {
    const percent = /^\d+(\.\d+)?%$/.test(value ?? '')
    this.element.style.width = percent ? value : ''
    this.elImage.style.width = percent ? '100%' : ''
    this.#size('width', percent ? null : value)
  }

  heightChanged (value) { this.#size('height', value) }

  sourceChanged () { this.#plan() }
  refChanged () { this.#plan() }

  /** Asks the image again: after `forgetImages()`. */
  reload () {
    if (this.key !== null) { release(this.key) }
    this.key = null
    this.#plan()
  }

  // ------------------------------------------------------------------ internals

  // source and ref change together: one load at the end of the task
  #plan () {
    if (this.planned) { return }
    this.planned = true
    queueMicrotask(() => {
      this.planned = false
      if (this.element !== null) { this.#load() }
    })
  }

  #load () {
    const name = this.element.getAttribute('source') ?? ''
    const ref = this.element.getAttribute('ref') ?? ''
    const key = `${name} ${ref}`
    if (key === this.key) { return }
    if (this.key !== null) { release(this.key) }
    this.key = null
    const request = ++this.request
    if (name === '' || ref === '') { return this.#fail() }
    if (!sources.has(name)) {
      if (!warned.has(name)) {
        warned.add(name)
        console.warn(`rc-image: the source '${name}' is not declared (defineImageSources)`)
      }
      return this.#fail()
    }
    this.key = key
    const entry = take(name, ref, this.element)
    if (entry.url !== null) { return this.#show(entry.url) }
    this.element.removeAttribute('failed')
    this.element.setAttribute('loading', '')
    entry.promise.then(url => {
      if (request !== this.request || this.element === null) { return }
      if (url === null) {
        release(key)
        this.key = null
        this.#fail()
      } else {
        this.#show(url)
      }
    })
  }

  #show (url) {
    this.element.removeAttribute('loading')
    this.element.removeAttribute('failed')
    this.elImage.src = url
    if (this.elImage.parentNode !== this.element) { this.element.replaceChildren(this.elImage) }
  }

  #fail () {
    this.element.removeAttribute('loading')
    this.element.setAttribute('failed', '')
    const text = document.createElement('span')
    text.textContent = this.element.getAttribute('alt') ?? ''
    this.element.replaceChildren(text)
  }

  // a size in pixels: on the image, and on the box shown while it loads
  #size (property, value) {
    const pixels = /^(\d+)(px)?$/.exec(value ?? '')
    if (pixels === null) {
      this.elImage.removeAttribute(property)
      this.element.style.removeProperty(`--rc-image-${property}`)
    } else {
      this.elImage.setAttribute(property, pixels[1])
      this.element.style.setProperty(`--rc-image-${property}`, `${pixels[1]}px`)
    }
  }
}
WComponent.define('rc-image', RcImage)
