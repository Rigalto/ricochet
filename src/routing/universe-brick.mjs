// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A resolver for the router (see the `router` module) that organises an application in **universes** and
 * **bricks**: `#universe/brick/…`. Each brick is declared once; each universe lists its bricks, and the same brick may
 * belong to several universes: its code is loaded once, while its data and its scope depend on the universe/brick
 * pair.
 *
 * - **Default path.** A missing or unknown universe leads to the first universe; a missing brick, or a brick that is
 *   not in the universe, to the first brick of the universe; a brick that has a default `mode` and no third term, to
 *   `universe/brick/mode`. These are redirects: the address is replaced, the history keeps no entry for them.
 * - **Rules.** Paths that do not follow the structure (a short link, a redirect that needs a request to a server)
 *   are handled by rules, functions called in order before the structure is checked. A rule returns a route, a
 *   redirect, or nothing to let the next rule or the structure decide. A rule may be asynchronous.
 * - **Route.** `{path, terms, universe, brick, rest, scope, load, definition}`: `rest` holds the terms after the
 *   brick, `scope` is `universe-brick`, `load` and `definition` come from the declaration of the brick.
 *
 * ```javascript
 * import {universeBrickResolver} from 'ricochet/routing/universe-brick.mjs'
 *
 * router.setResolver(universeBrickResolver({
 *   universes: {hom: {bricks: ['not', 'lnk']}, gam: {bricks: ['sdk', 'not']}},
 *   bricks: {
 *     not: {mode: 'table', load: () => import('./bricks/notes.mjs')},
 *     lnk: {mode: 'table', load: () => import('./bricks/links.mjs')},
 *     sdk: {load: () => import('./bricks/sudoku.mjs')},
 *   },
 * }))
 * ```
 *
 * An application that needs more fields in its routes wraps the resolver and completes the route it returns.
 *
 * @module universe-brick
 * @category routing
 */

/**
 * Creates the resolver.
 * @param {{universes: object, bricks: object, rules: Function[]}} options - `universes`: `{universe: {bricks: [names]},
 *   …}`, the first universe and the first brick of each universe are the defaults; `bricks`: `{brick: {mode, load, …},
 *   …}`, `mode` is the default third term, `load` the module of the brick (see the `router` module), the other fields
 *   are free; `rules`: functions called with the request before the structure is checked.
 * @returns {Function} The resolver, to give to `router.setResolver()`.
 */
export function universeBrickResolver ({universes, bricks, rules = []}) {
  const names = Object.keys(universes)
  console.assert(names.length > 0, 'universeBrickResolver: at least one universe is expected')
  for (const [universe, {bricks: list}] of Object.entries(universes)) {
    console.assert(Array.isArray(list) && list.length > 0, `universeBrickResolver: the universe '${universe}' has no brick`)
    for (const brick of list) {
      console.assert(bricks[brick] !== undefined, `universeBrickResolver: the brick '${brick}' of '${universe}' is not declared`)
    }
  }

  const pathOf = (universe, brick) => {
    const mode = bricks[brick].mode
    return mode === undefined ? `${universe}/${brick}` : `${universe}/${brick}/${mode}`
  }

  return async function resolve (request) {
    for (const rule of rules) {
      const result = await rule(request)
      if (result !== undefined && result !== null) { return result }
    }
    const {path, terms} = request
    const [universe, brick] = terms
    if (universes[universe] === undefined) {
      const first = names[0]
      return {redirect: pathOf(first, universes[first].bricks[0])}
    }
    if (brick === undefined || !universes[universe].bricks.includes(brick)) {
      return {redirect: pathOf(universe, universes[universe].bricks[0])}
    }
    const definition = bricks[brick]
    if (terms.length === 2 && definition.mode !== undefined) {
      return {redirect: pathOf(universe, brick)}
    }
    return {
      path,
      terms,
      universe,
      brick,
      rest: terms.slice(2),
      scope: `${universe}-${brick}`,
      load: definition.load ?? null,
      definition,
    }
  }
}
