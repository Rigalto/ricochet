# router

Module `router` · group `core` · source [`src/core/router.mjs`](../../src/core/router.mjs)

The router: hash routing (`#universe/brick/…`), which works on any static host, GitHub Pages included. The kernel
owns the mechanism; the application owns the structure of its routes, through a **resolver** (see principle 8 of
`docs/DESIGN.md`).

## The resolver

A function, possibly asynchronous, called with the request `{path, terms}`: `path` is the hash without `#` and
without a trailing `/` (not decoded: `%20` stays as is), `terms` its parts split on `/`. It returns:

- a **route**: an object with at least `path` and `terms`, and optionally `scope` (the string that replaces `$` in
  the names of configuration items), `load` (the module of the route, see below) and any field of the application;
- or a **redirect**: `{redirect: 'universe/brick/table'}`. The router replaces the address with `location.replace()`
  (no entry in the history) and resolves the new path. More than 10 redirects in a row are an error.

## A navigation

1. The resolver gives the route.
2. If the route has a `load`, `routeLoading` is emitted and the module is loaded: `load` is a function returning a
   promise (`() => import('./view-table.mjs')`, so that the path is relative to the application), or a URL or a
   name of the import map.
3. If another navigation started meanwhile, this one stops: only the latest one is applied.
4. The scope is set in the store of configuration items, then `routeChanged` is emitted with the route.

When the resolver or the module fails, `routeError` is emitted with `{path, error}` and the former route stays.

A component that listens to `routeChanged` receives the current route at the end of the current task, then at each
change: there is always a current route.

```javascript
import {router} from 'ricochet/core/router.mjs'

router.setResolver(({path, terms}) => terms[0] === '' ? {redirect: 'home'} : {path, terms, scope: terms[0]})
await router.start()
```

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| event | `routeChanged` | out | `object` | The route changed; the payload is the route. |
| event | `routeLoading` | out | `{path: string}` | The module of a route is loading. |
| event | `routeError` | out | `{path: string, error: Error}` | The resolver or the module of a route failed. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `Router` | class | The router. The application uses the `router` instance. |
| `router` | const | The router of the application. |
