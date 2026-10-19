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

The frame loop runs four phases: clocks and scheduled tasks, `update` (application), `render` (application),
microtasks with the remaining budget. It runs while a game holds it, or while microtasks are waiting; otherwise it
sleeps, and a timer wakes it when the next real time task is due. Office-style views and a real-time canvas can share
the same page. *(2026-10-16)*

The work is organised in **cycles of 1/60 s**, with a budget in milliseconds tuned for that rate (update 3 ms, render
4 ms, microtasks 5 ms), because the costs of the microtasks are measured on the computer the application is tuned on.
On a faster screen, a cycle spans several frames: at 120 Hz, one frame runs `update` and microtasks, the next `render`
and microtasks; each frame gets a share of the budget proportional to its duration. Games are drawn at 60 Hz and the
microtasks keep the time they have at 60 Hz. *(2026-10-18)*

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
- The route is the payload of the `routeChanged` event. A component that subscribes to `routeChanged` is called with
  the current route at the end of the current task, once its setup is finished: there is always a current route.
  *(clarified 2026-10-18)*
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
| 2026-10-17 | Component CSS: one `<style>` element per `css()` call, inserted at once, named after its first selector; unbalanced braces are reported | A syntax error stays in its own block; a module loaded on demand is never shown without its styles. |
| 2026-10-17 | Components of Ricochet put their CSS in the `ricochet` cascade layer; applications write outside any layer | Application rules always win, whatever the order and the specificity. |
| 2026-10-17 | `cssDefine()` and `@apply` are removed | Unused; classes and CSS custom properties do the same, in standard CSS. |
| 2026-10-17 | The kernel uses JavaScript up to ES2022 | It must run in Node.js 18 for the tests, and in Safari versions a few years old. |
| 2026-10-17 | Every source file starts with `// SPDX-License-Identifier: MIT` and `// Copyright (c) 2026 Rigalto` | Ricochet is copied module by module; the notice must travel with each file. |
| 2026-10-17 | The store of configuration items is in the kernel (`config`); storage goes through an adapter with `load()`, `save(entries, options)` and `remove(items)` | One store for every application; HTTP today, Google Drive tomorrow. |
| 2026-10-17 | Item observers are called at the end of the current task (native microtask), no longer after 20 ms | Changes are still grouped, and no frame is shown with the former value. |
| 2026-10-17 | Pending changes are saved at once when the page is hidden or closed; a failed save is tried again after 30 s | No change is lost. The delays of 2 s and 30 s will become scheduled tasks. |
| 2026-10-18 | Cycles of 1/60 s with an absolute budget (3 + 4 + 5 ms); on faster screens, `update` and `render` on different frames | Costs are measured at 60 Hz on the tuning computer; a budget proportional to a 120 Hz frame would leave no time for microtasks. |
| 2026-10-18 | One `requestAnimationFrame` loop for the page; `setAnimationFrame(update, render)` registers the animation of a component in it | One budget for every animation and task; the former API keeps working. |
| 2026-10-18 | A due scheduled task becomes a microtask; tasks of the same due time, or of the same priority and cost, run in creation order | One place where work runs, within the budget. |
| 2026-10-18 | Scheduling modes `add`, `once`, `restart`, `extend` and an absolute `at`, instead of one method each | A smaller API, covering the needs of Sixty-Below. |
| 2026-10-18 | Real time tasks wait while the page is hidden; the game clock advances only while a game holds the loop | The browser stops the frames of a hidden page; changes are saved when the page is hidden. |
| 2026-10-18 | No `setInterval` in applications: a repeated action is a scheduled task whose handler schedules the next one. `WController.setInterval()` runs on the scheduler and is deprecated | One time base and one budget; intervals wait while the page is hidden and are released like any task. |
| 2026-10-18 | The events used by the kernel are listed in `docs/EVENTS.md`, checked by a test; names starting with `rc` are reserved for internal events (`rcInterval`, `rcConfigSave`) | An application must know which names it cannot use. |
| 2026-10-18 | The module of a route is declared as a function (`load: () => import('./x.mjs')`), or a URL | A path written in the router would be resolved from the folder of Ricochet, not from the application. |
| 2026-10-18 | A new listener of `routeChanged` receives the current route at the end of the current task, not during `listen()` | Its `attach()` or constructor is finished when the route arrives. |
| 2026-10-18 | The router does not decode the path (`%20` stays as is) | The application keeps the address it wrote. |
| 2026-10-18 | `WComponent.define(tag, Class)` also defines the native custom element `<tag>`; both syntaxes mount the same class, `this.element` is the element | Components migrate one by one, without being rewritten. |
| 2026-10-18 | Custom elements are mounted only after the first `WComponent.render()` (called by `start()`); those connected before wait | The elements of the initial page would otherwise be mounted as soon as their module loads, before the items and the route. |
| 2026-10-18 | A custom element is detached at the end of the task in which it left the page, unless it came back | A move (disconnected then connected) keeps the component, as with the `as` attribute. |
| 2026-10-18 | Defined custom elements get `display: block` in the `ricochet` layer; `static display` chooses another value | They replace `<div as>` elements; any rule of the application or of the component wins. |
| 2026-10-18 | `static observedAttributes` declares the attributes of a component: `attributeChangedCallback` for a custom element, a mutation observer for an `[as]` element; the methods are called after `attach()` with the current values | The standard name; the same behaviour as `observeAttributes()`. |
| 2026-10-18 | Tests that need a DOM run in a browser page, `tests/browser/` | Node has no Custom Elements; no dependency is added. |
| 2026-10-18 | Colours are tokens (`--rc-surface`, `--rc-text`, `--rc-danger`…) computed in `oklch()` from three parameters (`--rc-hue`, `--rc-chroma`, `--rc-depth`); the formulas are declared on every element that sets a parameter | Palettes are no longer written colour by colour; a custom property computed from another one is resolved where it is declared. |
| 2026-10-18 | Palettes are named after their function (`header`, `view`, `module`), set with the `palette` attribute; `shade` (`light`, `medium`, `deep`) darkens a block | Uniform blocks, several palettes in a page, more palettes added when needed. |
| 2026-10-18 | Error, warning, success and info are states of a component, with their own tokens mixed with the surface of the block, not palettes | They fit any palette and both schemes. |
| 2026-10-18 | Day and night with `light-dark()` and `color-scheme`; the configuration item `ricochet-theme` (`system`, `day`, `night`); `scheme` forces a block | One switch for the whole page; the views that draw (canvas) listen to `themeChanged`. |
| 2026-10-18 | Configuration items used by Ricochet start with `ricochet-` and are listed in `docs/ITEMS.md`, checked by a test | As for events: the application must know which names it cannot use. |
| 2026-10-18 | The CSS of Ricochet may use `oklch()`, `color-mix()` and `light-dark()` (Safari 17.5) | Current versions of every target browser support them. |
| 2026-10-19 | `data-*` actions are delegated: one `click` listener on the document; the nearest element with actions runs them, not those above it; nothing runs inside a `disabled` or `aria-disabled` element; `static clickActions = false` for components whose `data-*` are not for clicks | Components need no click handler; one rule, like links. |
| 2026-10-19 | During the migration, elements of the former syntax (`as=`) and plain elements inside them keep their own click handlers | Their actions must not run twice, nor start running on clicks that did nothing before. |
| 2026-10-19 | `Tab`, `Space` and `Enter` are left to the browser when a control (button, link, `tabindex`) has the focus | Keyboard use of the components; games keep the keys when the page or a canvas has the focus. |
| 2026-10-19 | `rc-icon-button` holds a real `<button>`, stands on `--rc-surface-raised`, and offers `flat` for dense toolbars; shadows are classes of the theme (`rc-shadow-1…3`, `rc-text-shadow`) | Accessible by default; the block and its buttons have distinct backgrounds. |
| 2026-10-19 | `rc-checkbox` is an `rc-icon-button` (`role="checkbox"`); its state is the `checked` attribute (value `yes`/`no`); it changes the state in its own click listener, before the actions run; with `data-item`, it observes the item and follows it | No code in the parent to keep a box and its item in step; the actions see the new value. |
| 2026-10-19 | Radio buttons: `rc-radio-group` holds the value (`value` attribute) and the actions; each `rc-radio` offers one value; with `data-item`, the group observes the item; a click on the checked radio runs nothing (`acceptsClick()`, asked by the delegation) | One element to bind, read or listen to; native radios fire no change when the checked one is clicked again. |
| 2026-10-19 | The arrows are left to the component when a `role="radio"` element has the focus; the group moves the selection | Keyboard use of the radio groups (WAI-ARIA); games keep the arrows when the page or a canvas has the focus. |
| 2026-10-19 | `rc-input` holds a real `<input>`; the `value` attribute is the initial value (typing is not copied to it); `commit` = `input` (default), `change` or `enter` tells when the actions run, for a valid value only; with `data-item`, the field follows the item | The uses of SweetHome (live settings, search on Enter) with one attribute; no function given from outside. |
| 2026-10-19 | Validation: `required`, `min`/`max` (numbers), `pattern` (a regular expression, as in HTML) in the kernel; the application declares named checks (`defineChecks()`, used by `check`) and extends the field by a subclass (`transform()`, `validate()`) | The rules of an application stay in the application; a check may declare the attributes it reads. |
| 2026-10-19 | `observeAttributes(attributes, handlerName)`: one method for attributes known only when the component runs | The attributes read by the named checks of a field. |
| 2026-10-19 | Demos use only the interface of Ricochet (controllers, `listen()`, `data-*`), never the bus or kernel internals; tests may | A demo is read as an example. |
| 2026-10-19 | `rc-text-button` is its own element: its content (text, or any elements) moves into a `<button>`; looks `flat`, `link`, or the surface of a `palette`/`shade`; the looks of all the buttons are in one module (`button-style`) | The looks particular to an application (a « material » action, a calculator key) are a palette and classes of the application, not attributes of the kernel. |
| 2026-10-19 | No component for « a plain element with actions » (`mui-dataset-handler`): the delegation already runs the `data-*` of any element | One rule for every element. |
