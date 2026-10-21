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
| 2026-10-19 | The arrows are left to the component when a `role="radio"` element has the focus; the group moves the selection (later also `Home`, `End`, and `role="tab"`) | Keyboard use of the radio groups (WAI-ARIA); games keep the arrows when the page or a canvas has the focus. |
| 2026-10-19 | `rc-input` holds a real `<input>`; the `value` attribute is the initial value (typing is not copied to it); `commit` = `input` (default), `change` or `enter` tells when the actions run, for a valid value only; with `data-item`, the field follows the item | The uses of SweetHome (live settings, search on Enter) with one attribute; no function given from outside. |
| 2026-10-19 | Validation: `required`, `min`/`max` (numbers), `pattern` (a regular expression, as in HTML) in the kernel; the application declares named checks (`defineChecks()`, used by `check`) and extends the field by a subclass (`transform()`, `validate()`) | The rules of an application stay in the application; a check may declare the attributes it reads. |
| 2026-10-19 | `observeAttributes(attributes, handlerName)`: one method for attributes known only when the component runs | The attributes read by the named checks of a field. |
| 2026-10-19 | Demos use only the interface of Ricochet (controllers, `listen()`, `data-*`), never the bus or kernel internals; tests may | A demo is read as an example. |
| 2026-10-19 | `rc-text-button` is its own element: its content (text, or any elements) moves into a `<button>`; looks `flat`, `link`, or the surface of a `palette`/`shade`; the looks of all the buttons are in one module (`button-style`) | The looks particular to an application (a « material » action, a calculator key) are a palette and classes of the application, not attributes of the kernel. |
| 2026-10-19 | No component for « a plain element with actions » (`mui-dataset-handler`): the delegation already runs the `data-*` of any element | One rule for every element. |
| 2026-10-19 | `rc-textarea` is an `rc-input` with a `<textarea>` (hooks `createField()`, `isCommitKey()`, `fieldUpdated()`); `Ctrl`/`⌘` + `Enter` commits | One code for validation, actions and look; `Enter` writes a new line. |
| 2026-10-19 | The height of `rc-textarea` follows its text with the CSS property `field-sizing: content` (Chrome 123, Safari 26.2, Firefox 152), between `rows` and `max-rows` lines; otherwise the component measures the text at each change, and again when the width changes or the field appears (`ResizeObserver`) | No timer: a field inside a hidden block gets its height when it is shown; both ways give the same heights (tested). |
| 2026-10-19 | `rc-select` holds a native `<select>`; options from the HTML, the `options` attribute (`label#value|…`), the `options` property, or a named source (`source="name argument"`); `none` adds a first option `''`; the wanted value is kept while the options change | The list of the browser everywhere (a wheel on a phone); options loaded later still show the value given before. |
| 2026-10-19 | Sources of options are declared by the application (`defineOptionSources()`): a function of the argument that returns options or a `Promise`, and the items and events after which they are asked again; built-in source `item` | Options from the data of an application (its sheets) without the kernel knowing them; the answer to a former request is ignored. |
| 2026-10-19 | The keys typed in a `<select>` are left to the browser, as in an `<input>` | Arrows choose an option. |
| 2026-10-19 | No `rc-panel` component: a class `rc-panel` of the theme (block, rounded corners, padding), with the palette attributes and the shadow classes; shadow inside the block: `rc-shadow-inset` (`--rc-elevation-inset`) | A panel has no behaviour; a class also goes on a meaningful element (`section`, `aside`, `form`). The `html` attribute of `mui-panel` was not used. |
| 2026-10-19 | Tabs: `rc-tabs` holds `rc-tab` elements (`value`, `label`, `icon`, `title`, `disabled`) and builds the bar of their titles; the value and the actions are on `rc-tabs`, as for a radio group; the content of every tab stays in the page, hidden | The components of a hidden tab keep their state; the bar follows the tabs added, removed or changed. |
| 2026-10-19 | `rc-tab` is a component, though it only sets its role: every `rc-*` tag is a component | One rule for the tags of the kernel. |
| 2026-10-19 | The arrows, `Home` and `End` are left to a focused `role="tab"` as to a `role="radio"`; the radio groups also know `Home` and `End` | The keyboard pattern of WAI-ARIA for tabs and radio groups. |
| 2026-10-19 | The keyboard keeps a stack of windows (`openLayer(owner, keys)`, `closeLayer(owner)`): the window on top alone receives the keys, `Escape` is a key it declares; `overlayChanged {open}` at each change; the former `dropdownOpen`/`dropdownClose`, `setModalKeys()`, `setAlertKeys()` become facades of this stack | Windows open on windows (a dropdown in a dropdown, an alert on a dialog); one rule instead of two flags. |
| 2026-10-19 | `rc-dropdown`: the window is a popover (`popover="manual"`, top layer); content written inside (kept) or a component named by `content` (created at each opening); closed by a press outside, `Escape`, `data-close`, `dropdownClose` (`{}` or `{id}`); placed by CSS anchor positioning, or computed (also when the content changes size) | Never cut by `overflow` nor hidden by `z-index`; no delay to wait for the content (`position-delay`). |
| 2026-10-19 | `rc-dialog`: a native `<dialog>` opened modal (attribute `open`, action `data-dialog="id"`); `data-close="value"` closes it, then its actions run with that value (`Escape`: `cancel`; `Enter`: the `default` element); `showAlert()` and `showConfirm()` answer with an event | A dialog is a field whose value is the button chosen; no function given to call back. |
| 2026-10-19 | The default display of a component does not apply to an element with the `hidden` attribute (`tag:not([hidden])`) | `hidden` hides a component, as any element. |
| 2026-10-19 | `rc-slider` holds a native `<input type="range">` (keyboard of the browser), its value shown with `unit`; `commit` = `input` (while the thumb moves) or `change` (when released); the track and the thumb drawn with the tokens (`-webkit-`/`-moz-` pseudo-elements), the part before the thumb in `--rc-selected` | The same slider in every browser and palette; the value shown follows the thumb (it did not in `mui-slider`). |
| 2026-10-19 | Floating buttons: `rc-floating-bar` (the line, at the end of the view, `position: sticky` at the bottom of the screen), `rc-floating-group` (`side`, `gradient`, its keys as floating keys under its `name`), `rc-floating-button` (a round `rc-icon-button`, `key`); colours `--rc-floating` and `--rc-floating-text`, darker by rank (`oklch(from …)`); hidden while a window is open and when printed | Stuck at the bottom while the view scrolls, below the view at its end: it takes its own place, and follows the width of the view (no footer to size, no offset for the modules). |
| 2026-10-19 | The class `rc-panel` does not apply to an element with `hidden` | `hidden` hides a panel, as any element. |
| 2026-10-20 | The checks of the icon set (categories, compression, drawing rules) are unit tests (`tests/test-iconset.mjs`), no longer run at each loading of the module | No message in the console of the applications; a broken table fails the tests. |
| 2026-10-20 | Two guides: `docs/GUIDE.md` (from getting the kernel to a complete minimal application) and `docs/THEME.md` (palettes, day and night, tokens, the look of a component); a home page (`index.html`) with the demos and the documentation | The examples of the guides are run before they are published. |
| 2026-10-20 | Two entry points: `src/ricochet.mjs` re-exports the kernel (not the bus, not the interface); `src/ui/all.mjs` loads and re-exports every component of the interface, the theme and the icon set; each module stays importable alone | Without a build step, an entry point loads everything it re-exports: the kernel stays light, and an application that uses the interface loads it once, at startup, so that no tag is forgotten. |
| 2026-10-20 | At the end of each mounting, a custom element that no module defines is reported (`:not(:defined)`), once per tag, with the component that holds it; `$global.debug.strict` throws instead | A forgotten import leaves an unknown element, silently: the browser shows no error. |
| 2026-10-20 | The utilities have their own entry point, `src/ricochet-utils.mjs`, apart from the kernel (`ricochet.mjs`); the DOM and Markdown utilities, used by the components, stay in the kernel | An application may use its own utilities or a library it knows, and never load these. |
| 2026-10-20 | The names of the utilities follow lodash/es-toolkit, Three.js `MathUtils` and date-fns (`clamp`, `deburr`, `upperFirst`, `damp`, `mapLinear`, `degToRad`, `addMonths`…); where the language does the work, the documentation points to it (`structuredClone`, `Intl.NumberFormat`) | The main frameworks (React, Vue, Svelte, Lit) give almost no utilities: their users know these libraries. |
| 2026-10-20 | Calendar dates are ISO strings `YYYY-MM-DD`, without time zone; patterns use the Unicode letters (`dd/MM/yyyy`); the functions have the meaning of `Temporal` (`addMonths` clamps the day, `dateDifference` as `until`) | One format for inputs, JSON and sorting; moving to `Temporal` later keeps the data. |
| 2026-10-20 | Random numbers: a seeded `Random` class (sfc32, seeds by `djb2` and splitmix32), an application instance `random`; the former LCG is dropped | Better statistical quality; several independent generators; the state can be saved. |
| 2026-10-20 | Unique identifiers in base 26 (seed kept in a configuration item, written once every 26 identifiers), not `crypto.randomUUID()` | Short and cheap to make (taken from Sixty-Below). |
| 2026-10-20 | `debounce` and `throttle` emit an event through the scheduler (delay) and the microtasker (leading call), instead of calling a function | Everything is an event: the work runs in the spare time of a frame, with its declared priority, and is cancelled with its owner. |
| 2026-10-20 | `Complex` is taken from `com-vector.mjs` of SweetHome (not `com-complex.mjs`), with `exp()`, `ln()` and `toFixed()` fixed; an unreadable form or a division by zero gives `NaN` parts | As JavaScript numbers do. |
| 2026-10-20 | Double click: `data-dblclick` emits its own events on the `dblclick` of the document; on such an element, the click runs at once and the second click of a double click (`detail` 2) is ignored; `doubleClickHandler` (400 ms delay on every click) is deprecated | No delay; the double click follows the setting of the system; the click must make sense before the double click (select, then open), so a table does not unselect a selected row on a click. |
| 2026-10-20 | Floating buttons: an attribute `size` (size of the icons) on the bar, a group or a button, the nearest one wins; the button measures 5/3 of it, the space between buttons 2/3, the margin 1/3 (CSS properties `--rc-floating-size`, `--rc-floating-gap`, `--rc-floating-margin`) | One attribute makes the bar fit a phone (`size="22"`: two arrows and four buttons in 390 px), as `size` does for `rc-icon-button`. |
| 2026-10-20 | `rc-select`: while the options of a source and an argument are being loaded, the other selects that ask for them share the same `Promise`; nothing is kept once it has answered | One request for several selects of a view, or for one refresh event; no stale cache: keeping data between requests is the job of the data layer of the application. |
| 2026-10-20 | Ricochet is distributed by copy only (Git submodule or copy of `src/`), not through a CDN; the documentation presents the local copy as the way to use it | The application controls its version, depends on no third-party server, works offline and from one origin. May be revisited at the end of the porting, or on request. |
| 2026-10-20 | The palette tools are modules of SweetHome, not part of the kernel; the demos hold a copy (`demo/mod-palette-editor.mjs`, in `demo/modules.html` with a simpler frame), which keeps its settings in configuration items (in memory in the demo) | They show a real module written with Ricochet only; the content is the same as in the application. |
| 2026-10-21 | `window.$global` is the only global of Ricochet, for debugging only: no code may depend on it; the state of an application does not belong there; errors are counted in `$global.errors` (no longer in `memoryLeak`); the application adds its switches, logs and counters with `addDebugSwitches`, `trace`, `addLog`, `countLeak` (`leakSnapshot`/`leakChanges` compare the counters); a guide, `docs/DEBUG.md` | One place to look from the console, nothing else on `window`; the kernel no longer adds `console.lifecycle`, and wraps only `console.error` and `console.assert`, to count them. |
| 2026-10-21 | Display mode `pc` or `phone`, chosen once by `start()` (shorter side of the screen below 600 px), forced by the item `ricochet-display`; `<html display-mode="…">` for CSS, `displayMode` for code | Two versions of the interface rather than a responsive layout; the shorter side ignores the orientation and the size of the window. |
| 2026-10-21 | `rc-dialog closedby="any"`: a click outside the window closes it with `cancel`, as `Escape`; not by default | The name and the value of the attribute of the native `<dialog>`, which Safari does not support yet; for a window of choices, not for a form that would lose its content. |
| 2026-10-21 | `rc-dropdown`: `icon` may change after the mounting, the button follows | A button whose icon shows the choice made in its window (the day/night mode). |
