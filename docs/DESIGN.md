# Design decisions

The principles Ricochet is built on, and the decisions taken while extracting it from SweetHome. New code follows
them; changing one of them is a decision of its own, recorded here with its date and its reason.

## Principles

### 1. Everything is an event

A component communicates with the application and with its environment through events only: it receives events,
does its own work (including changes to the DOM nodes it owns), and emits events. It never calls another component
and never knows who listens. Sources of events: mouse, keyboard, window, attributes, configuration items, data
records (local or remote), the event bus, the frame loop, microtasks and scheduled tasks. *(2026-10-16)*

### 2. Three moments for one event

An event is emitted **now** (synchronous call of the listeners), **in the spare time of the current frame** (a
microtask, run within a time budget) or **later** (a scheduled task, in game time or real time). The listener does
not know which moment was used. Handlers stay short and defer long work themselves. *(2026-10-16)*

- Microtasks and scheduled tasks carry an event name and a payload, never a function reference.
- The priority and the cost of a microtask are declared once, in a table, by the module that does the work.
- Microtasks and scheduled tasks created by a component are cancelled when it is detached, like its subscriptions.
- Tasks due at the same time run in the order they were created.

### 3. One synchronous bus

All events go through one synchronous bus (a map from event name to listeners). DOM events (mouse, keyboard,
attributes, window) stay at the edges, as inputs. The former bus, built on `CustomEvent` and a hidden element, is
replaced: `dispatchEvent` was already synchronous, so behaviour does not change. Emitting an event allocates nothing.
*(2026-10-16)*

### 4. Reactions, not renders

No virtual DOM, no re-rendering: a component keeps references to its nodes and writes only what changed. *(origin)*

### 5. A frame loop that runs only when needed

The frame loop runs four phases: clock and scheduled tasks, `update` (application), `render` (application),
microtasks with the remaining budget. It runs while a game holds it, or until the microtask and scheduled-task queues
are empty; otherwise it sleeps. The budget is a fraction of the measured frame duration, not a fixed value, so that
120 Hz screens are handled. Office-style views and a real-time canvas can share the same page. *(2026-10-16)*

### 6. Zero dependencies, zero build

Plain ES modules, run as written. When a feature needs a library (HTML sanitizing, for instance), Ricochet defines
the hook and the application provides the library (`setSanitizer()`). *(2026-10-16)*

### 7. Handlers are named methods, bound by the kernel

A component subscribes by **naming** the method that handles a stimulus, never by passing a function. By default the
name is derived from the stimulus; another method name may be given as a string. *(origin, written down 2026-10-16)*

| Stimulus | Default handler |
| --- | --- |
| Event `tableRowSelected` (bus, microtask or scheduled task) | `tableRowSelectedDispatched(payload)` |
| Attribute `icon`, `no-label` | `iconChanged(newValue, oldValue)`, `noLabelChanged(…)` |
| Configuration items | `itemsChanged(items)` |
| Window event, interval, animation frame | method named explicitly |

- No anonymous function or closure can subscribe: every subscription belongs to its component and is released when
  the component is detached.
- Handlers show up by name in debugging tools; a missing handler is reported when subscribing, not when the first
  event arrives.
- Event names are camelCase identifiers (no `-`, `/` or `:`), so that the handler name can be derived.
- The kernel binds each method once, keeps the bound function in a map of the instance, and never overwrites the
  method on the instance: subscribing twice is harmless and unsubscribing always finds the right function.
- The low-level bus accepts functions, but only kernel code uses it directly.

### 8. Routing: a kernel core, an application resolver

The kernel does not know the structure of the routes; it owns the mechanism. *(2026-10-17)*

- The router listens to `hashchange` (hash routing works on any static host, GitHub Pages included). It splits the
  path and hands it to a **resolver provided by the application**, which returns the route, or asks for a redirect.
  The resolver may be asynchronous.
- The route is the payload of the `routeChanged` event. A component that subscribes to `routeChanged` is called at
  once with the current route: there is always a current route.
- The route carries a `scope`: the string that replaces `$` in the names of configuration items. The router sets the
  scope **before** emitting `routeChanged`, so no listener ever reads an item with the former scope.
- Redirects use `location.replace()`: they do not add an entry to the history.
- A route may need a module. The application declares it in its route table; the router loads it with `import()`
  **before** emitting `routeChanged`, so the view only inserts its HTML. When navigations overlap, only the latest
  one is applied. `routeLoading` is emitted before a load, `routeError` when it fails (the former route stays).
- An optional resolver, `routing/universe-brick.mjs`, implements the universe/brick structure declaratively: each brick
  is declared once (module, view), each universe lists its bricks. The same brick may belong to several universes:
  its code is loaded once, while its data and its scope depend on the universe/brick pair.

### 9. One entry point: `await start()`

The application starts Ricochet with `await start({root, storage, router, sanitizer})`. The steps always run in this
order: internal setup (debug state, bus, keyboard); loading of the configuration items; resolution of the current
route, including its module and its scope; mounting of the interface from `root`; listening to route changes.
`start()` resolves when the application is ready, or rejects with the error that stopped it. *(2026-10-17)*

## Decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-10-15 | Native Custom Elements in light DOM, no Shadow DOM, no customized built-ins (`is="…"`) | Global palettes and utility classes must keep working; Safari does not support `is="…"`. |
| 2026-10-15 | Element prefix `rc-` (formerly `mui-`) | `mui` evokes Material UI. |
| 2026-10-15 | Kernel written in English: code, comments, documentation | Ricochet is public; the application may stay in French. |
| 2026-10-16 | Relative imports inside the kernel; applications use the `ricochet/` prefix through an import map | The kernel must work wherever it is hosted. |
| 2026-10-16 | Applications copy Ricochet (submodule, copy, or pinned CDN), never load it from Ricochet's GitHub Pages site | Pages serves unreleased code and is not a CDN. |
| 2026-10-16 | Documentation generated from `/** … */` blocks by `tools/doc.mjs`, in restricted Markdown, at each commit | One source for VSCode tooltips, GitHub pages and the application. |
| 2026-10-16 | Stimuli documented in one *Interface* table; no automatic detection from the code for now | Readable at a glance; detection can come later. |
| 2026-10-16 | Restricted Markdown, converted in one pass, readable by any Markdown reader | No dependency; same files everywhere. |
| 2026-10-16 | Unit tests for kernel modules (Node, no dependency); application tests only for specific algorithms | The kernel is shared; the application changes fast. |
| 2026-10-16 | During migration, old names stay as facades marked `@deprecated`, then are removed | The application keeps running at every step. |
| 2026-10-16 | Target browsers: Safari first, Chrome and Edge; Firefox when possible | Safari is the main browser of the author. |
| 2026-10-16 | Sixty-Below stays independent from Ricochet | Its kernel inspires Ricochet's real-time part, without API compatibility. |
| 2026-10-17 | Configuration items are kept by a store provided by the application (`setItemStore()`); the kernel only calls it | The same kernel works with an HTTP server today and Google Drive tomorrow. |
| 2026-10-17 | On detach, the kernel releases every subscription **before** calling `detach()`, and an error in `detach()` is caught | A failing `detach()` must not leave subscriptions behind. |
| 2026-10-17 | An element moved within the page keeps its component; keyboard keys are released only by the component that declared them | Detaching is deferred: a new view is mounted before the former one is detached. |
