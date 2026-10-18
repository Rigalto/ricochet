# universe-brick

Module `universe-brick` · group `routing` · source [`src/routing/universe-brick.mjs`](../../src/routing/universe-brick.mjs)

A resolver for the router (see the `router` module) that organises an application in **universes** and
**bricks**: `#universe/brick/…`. Each brick is declared once; each universe lists its bricks, and the same brick may
belong to several universes: its code is loaded once, while its data and its scope depend on the universe/brick
pair.

- **Default path.** A missing or unknown universe leads to the first universe; a missing brick, or a brick that is
  not in the universe, to the first brick of the universe; a brick that has a default `mode` and no third term, to
  `universe/brick/mode`. These are redirects: the address is replaced, the history keeps no entry for them.
- **Rules.** Paths that do not follow the structure (a short link, a redirect that needs a request to a server)
  are handled by rules, functions called in order before the structure is checked. A rule returns a route, a
  redirect, or nothing to let the next rule or the structure decide. A rule may be asynchronous.
- **Route.** `{path, terms, universe, brick, rest, scope, load, definition}`: `rest` holds the terms after the
  brick, `scope` is `universe-brick`, `load` and `definition` come from the declaration of the brick.

```javascript
import {universeBrickResolver} from 'ricochet/routing/universe-brick.mjs'

router.setResolver(universeBrickResolver({
  universes: {hom: {bricks: ['not', 'lnk']}, gam: {bricks: ['sdk', 'not']}},
  bricks: {
    not: {mode: 'table', load: () => import('./bricks/notes.mjs')},
    lnk: {mode: 'table', load: () => import('./bricks/links.mjs')},
    sdk: {load: () => import('./bricks/sudoku.mjs')},
  },
}))
```

An application that needs more fields in its routes wraps the resolver and completes the route it returns.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `universeBrickResolver` | function | Creates the resolver. |

## Details

### universeBrickResolver()

Creates the resolver.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {universes: object, bricks: object, rules: Function[]} | `universes`: `{universe: {bricks: [names]}, …}`, the first universe and the first brick of each universe are the defaults; `bricks`: `{brick: {mode, load, …}, …}`, `mode` is the default third term, `load` the module of the brick (see the `router` module), the other fields are free; `rules`: functions called with the request before the structure is checked. |

**Returns** `Function` The resolver, to give to `router.setResolver()`.
