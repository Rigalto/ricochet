// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The entry point of an application (principle 9 of `docs/DESIGN.md`):
 *
 * ```javascript
 * import {start} from 'ricochet/core/start.mjs'
 *
 * await start({root: '#root', storage: myAdapter, router: myResolver, sanitizer: html => DOMPurify.sanitize(html)})
 * ```
 *
 * The steps always run in this order:
 *
 * 1. internal setup: debugging state, bus, keyboard, frame loop (on import);
 * 2. the sanitizer, if given, is registered (`setSanitizer()`);
 * 3. the configuration items are loaded through the storage adapter, if given (`config.setAdapter()`, `config.load()`),
 *    and the display mode is chosen (`pc` or `phone`, see the `display` module);
 * 4. the current route is resolved, with its module and its scope, if a resolver is given;
 * 5. the interface is mounted from `root` (`WComponent.render()`);
 * 6. the router listens to the changes of the address.
 *
 * Every option is optional: a page without stored items or without routes skips the matching steps.
 *
 * @module start
 */

import {config} from './config.mjs'
import {chooseDisplayMode} from './display.mjs'
import {router} from './router.mjs'
import {WComponent} from './w-component.mjs'
import {setSanitizer} from '../utils/dom.mjs'
import './loop.mjs'

/**
 * Starts the application.
 * @param {{root: Element|string, storage: object, router: Function, sanitizer: Function}} [options] - `root`: the
 *   element to mount, or a CSS selector (default: `document.body`); `storage`: the storage adapter of the
 *   configuration items; `router`: the resolver of the routes; `sanitizer`: the function that cleans HTML of external
 *   origin.
 * @returns {Promise<{route: object|null}>} Resolved when the application is ready, with the current route; rejected
 *   with the error that stopped it.
 */
export async function start ({root = null, storage = null, router: resolver = null, sanitizer = null} = {}) {
  if (sanitizer !== null) { setSanitizer(sanitizer) }
  if (storage !== null) {
    config.setAdapter(storage)
    await config.load()
  }
  chooseDisplayMode(config.get('ricochet-display'))
  let route = null
  if (resolver !== null) {
    router.setResolver(resolver)
    route = await router.resolve({throws: true})
  }
  const element = typeof root === 'string' ? document.querySelector(root) : root ?? document.body
  if (element === null) { throw new Error(`start: no element for '${root}'`) }
  WComponent.render(element)
  if (resolver !== null) { router.listen() }
  return {route: router.current ?? route}
}
