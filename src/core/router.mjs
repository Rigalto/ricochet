// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The router: hash routing (`#universe/brick/…`), which works on any static host, GitHub Pages included. The kernel
 * owns the mechanism; the application owns the structure of its routes, through a **resolver** (see principle 8 of
 * `docs/DESIGN.md`).
 *
 * ## The resolver
 *
 * A function, possibly asynchronous, called with the request `{path, terms}`: `path` is the hash without `#` and
 * without a trailing `/` (not decoded: `%20` stays as is), `terms` its parts split on `/`. It returns:
 *
 * - a **route**: an object with at least `path` and `terms`, and optionally `scope` (the string that replaces `$` in
 *   the names of configuration items), `load` (the module of the route, see below) and any field of the application;
 * - or a **redirect**: `{redirect: 'universe/brick/table'}`. The router replaces the address with `location.replace()`
 *   (no entry in the history) and resolves the new path. More than 10 redirects in a row are an error.
 *
 * ## A navigation
 *
 * 1. The resolver gives the route.
 * 2. If the route has a `load`, `routeLoading` is emitted and the module is loaded: `load` is a function returning a
 *    promise (`() => import('./view-table.mjs')`, so that the path is relative to the application), or a URL or a
 *    name of the import map.
 * 3. If another navigation started meanwhile, this one stops: only the latest one is applied.
 * 4. The scope is set in the store of configuration items, then `routeChanged` is emitted with the route.
 *
 * When the resolver or the module fails, `routeError` is emitted with `{path, error}` and the former route stays.
 *
 * A component that listens to `routeChanged` receives the current route at the end of the current task, then at each
 * change: there is always a current route.
 *
 * ```javascript
 * import {router} from 'ricochet/core/router.mjs'
 *
 * router.setResolver(({path, terms}) => terms[0] === '' ? {redirect: 'home'} : {path, terms, scope: terms[0]})
 * await router.start()
 * ```
 *
 * @module router
 * @fires {object} routeChanged - The route changed; the payload is the route.
 * @fires {{path: string}} routeLoading - The module of a route is loading.
 * @fires {{path: string, error: Error}} routeError - The resolver or the module of a route failed.
 */

import {bus} from './bus.mjs'
import {itemStore} from './items.mjs'

const MAX_REDIRECTS = 10

// the hash of the address, without '#' and without a trailing '/'
const currentPath = () => {
  let path = globalThis.location?.hash ?? ''
  if (path.startsWith('#')) { path = path.slice(1) }
  if (path.endsWith('/')) { path = path.slice(0, -1) }
  return path
}

/**
 * The router. The application uses the `router` instance.
 */
export class Router {
  #resolver = null
  #current = null
  #navigation = 0 // number of the latest navigation
  #redirects = 0 // redirects in a row
  #listening = false
  #pending = 0 // navigations in progress
  // a redirect made during start() may deliver its hashchange after the route is applied: nothing to do then
  #onHashChange = () => {
    if (this.#pending === 0 && this.#current !== null && currentPath() === this.#current.path) { return }
    this.resolve()
  }

  /**
   * Sets the resolver of the application.
   * @param {Function} resolver - Called with `{path, terms}`; returns (or resolves with) a route or `{redirect}`.
   */
  setResolver (resolver) {
    console.assert(typeof resolver === 'function', 'Router.setResolver: a function is expected')
    this.#resolver = resolver
  }

  /** The current route, `null` before the first navigation. */
  get current () { return this.#current }

  /**
   * Resolves the current address, then listens to its changes. Called once by `start()`.
   * @returns {Promise<object>} The route, once applied; rejected if the first navigation fails.
   */
  async start () {
    const route = await this.resolve({throws: true})
    this.listen()
    return route
  }

  /** Listens to the changes of the address. `start()` calls it after the first navigation. */
  listen () {
    if (this.#listening || typeof window === 'undefined') { return }
    window.addEventListener('hashchange', this.#onHashChange)
    this.#listening = true
  }

  /** Stops listening to the address. */
  stop () {
    if (this.#listening) { window.removeEventListener('hashchange', this.#onHashChange) }
    this.#listening = false
  }

  /**
   * Goes to a path: a new entry in the history, then a navigation.
   * @param {string} path - The path, with or without `#`.
   */
  navigate (path) {
    globalThis.location.hash = path.startsWith('#') ? path : `#${path}`
  }

  /**
   * Resolves the current address and applies the route. Called at each change of the address.
   * @param {{throws: boolean}} [options] - `throws`: rejects on failure, instead of emitting `routeError` only.
   * @returns {Promise<object|null>} The route applied, or `null` if this navigation was replaced by a newer one or
   *   ended with a redirect.
   */
  async resolve ({throws = false} = {}) {
    console.assert(this.#resolver !== null, 'Router.resolve: no resolver, call setResolver() first')
    const navigation = ++this.#navigation
    const path = currentPath()
    const terms = path.split('/')
    this.#pending++
    try {
      const route = await this.#resolver({path, terms})
      if (navigation !== this.#navigation) { return null }
      if (route === null || typeof route !== 'object') { throw new Error(`no route for '${path}'`) }
      if (typeof route.redirect === 'string') {
        if (++this.#redirects > MAX_REDIRECTS) {
          this.#redirects = 0
          throw new Error(`more than ${MAX_REDIRECTS} redirects, the last one to '${route.redirect}'`)
        }
        const target = route.redirect.startsWith('#') ? route.redirect : `#${route.redirect}`
        globalThis.location.replace(target)
        // without a window (tests), or when the address does not change, no hashchange event comes
        if (!this.#listening || currentPath() === path) { return this.resolve({throws}) }
        return null
      }
      this.#redirects = 0
      if (route.load !== undefined && route.load !== null) {
        bus.emit('routeLoading', {path})
        await (typeof route.load === 'function' ? route.load() : import(route.load))
        if (navigation !== this.#navigation) { return null }
      }
      const store = this.#store()
      if (store !== null && typeof store.setScope === 'function') { store.setScope(route.scope ?? '') }
      this.#current = route
      bus.emit('routeChanged', route)
      return route
    } catch (error) {
      if (navigation !== this.#navigation) { return null }
      this.#redirects = 0
      console.error(`Router: navigation to '${path}' failed`, error)
      bus.emit('routeError', {path, error})
      if (throws) { throw error }
      return null
    } finally {
      this.#pending--
    }
  }

  #store () {
    try { return itemStore() } catch { return null }
  }
}

/** The router of the application. */
export const router = new Router()
