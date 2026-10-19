<p align="center">
  <img src="ricochet.svg" alt="Ricochet" width="96" height="96">
</p>

<h1 align="center">Ricochet</h1>

<p align="center">
  A zero-dependency JavaScript kernel where components react to signals, act on their own DOM, and emit signals.<br>
  No virtual DOM. No build step. No framework to learn beyond a dozen methods.
</p>

---

> **Status: early.** Ricochet is being extracted from a personal application where it has run in production for several years.
> The API described here is the current one; it will evolve as the kernel moves to native Custom Elements (see [Roadmap](#roadmap)).

## Why Ricochet?

Most front-end frameworks compute a view from a state, then reconcile it with the DOM. Ricochet takes the opposite path:
**nothing is ever re-rendered**. Each component receives stimuli, does its own work, changes the exact DOM nodes it owns,
and sends stimuli in turn — like a stone skipping on water, one impact triggering the next.

### Everything is an event

A component talks to the rest of the application, and to its environment, **through events only**. It receives
events, does its own work, and emits other events. It never calls another component and never knows who listens.

| Source | Examples |
| --- | --- |
| Mouse and keyboard | a click, a key handled by the layered keyboard controller |
| Window | resize, visibility change |
| Attribute | an attribute of the component's element changes |
| Configuration item | a shared item changes |
| Data | a record changes, in the application or in a remote store |
| Event bus | another component emits an event |
| Frame loop | a new frame starts (games and simulations) |
| Microtask | an event deferred to the spare time of the current frame |
| Scheduled task | an event due at a given time, in game time or real time |

An event can be emitted at three moments: **now** (synchronous), **in the spare time of the current frame** (a
microtask, within a time budget), or **later** (a scheduled task). The listener cannot tell which one was used. A
handler stays short; when the work is long, the handler itself defers it as a microtask. The priority and the cost of a
microtask are declared once, by the module that does the work, not by the one that emits the event.

```javascript
declareTasks({tileUpdate: {priority: 5, cost: 0.5}}) // by the module that does the work
this.emit('tileChanged', {x, y})                      // now
this.defer('tileUpdate', {x, y})                      // in the spare time of the frame
this.schedule('plantGrow', {id}, 30000, {clock: 'game'}) // later, in game time
```

The work is organised in **cycles of 1/60 s** with a budget in milliseconds (3 ms update, 4 ms render, 5 ms
microtasks), whatever the screen: on a 120 Hz screen, one frame runs `update` and microtasks, the next `render` and
microtasks. The loop runs only while a game holds it or tasks are waiting.

What sets it apart:

- **Reactions, not renders.** A component keeps direct references to its nodes and updates them surgically
  (`this.elLabel.textContent = …`). There is no virtual DOM, no template diffing, no render cycle.
- **Anonymous broadcast instead of a component tree.** Components never call each other and never know their parent or
  children. They publish on shared channels and subscribe to what they care about. Data does not flow "down" and events
  do not bubble "up": everything travels flat.
- **Shared state that persists by itself.** Configuration items are a reactive key/value store *and* an automatic
  save. Setting an item notifies every observer and schedules its persistence.
- **Behaviour declared in HTML.** A button needs no JavaScript to set an item, fire an event, navigate or copy text:
  `data-item`, `data-event`, `data-path`, `data-url`, `data-paste` are handled by one click listener on the document
  (see [docs/api/actions.module.md](docs/api/actions.module.md)).
- **Centralised, layered keyboard handling.** Alert › modal › focused module › floating buttons › view: each key press
  goes to the highest layer that listens for it, and to no one else.
- **Styles next to the component.** Each component declares its CSS in its own module; the rules are in the page
  before it is mounted, isolated from the others, and named in the inspector.
- **Built-in instrumentation.** Leak counters (attached components, listeners, timers, animation frames) and timelines of
  events, configuration changes and network requests, readable from the console or from a debug view.
- **Documentation from the code.** The same `/** … */` comments feed the tooltips of VSCode, Markdown pages that GitHub
  displays, and a JSON index your application can show. Names, parent classes and exports are read from the code, so
  they never drift; a Git hook regenerates everything at each commit.
- **Zero dependencies, zero build.** Plain ES modules. The code you write is the code the browser runs.

## Core concepts

Ricochet has two base classes and three communication channels.

| Concept | Role |
| --- | --- |
| `WComponent` | Bound to a DOM element. Many instances. Mounts with `attach()`, cleans up automatically when the element leaves the DOM. |
| `WController` | No DOM. A singleton created when its module is imported (keyboard, data proxies, business logic). Same API as `WComponent` for signals. |
| **Event bus** | Volatile signals: `emit(name, payload)` / `listen(name)`. |
| **Configuration items** | Persistent shared state: `setItem(item, value)` / `observeItems([items])`. Observers are called once per task; changes are saved after 2 s, or at once when the page closes, through a storage adapter. |
| **Data proxy** | Complex records: create / update / delete, memory cache, change notification for observers. |

Everything a component subscribes to — events, items, attributes, window events, intervals, animation frames — is
released when it is detached. No manual cleanup in normal use.

## A quick look

```html
<like-button data-event="liked" data-param='{"id": 42}'></like-button>
<like-counter></like-counter>
```

```javascript
import {WComponent} from 'ricochet/core/w-component.mjs'
import {css} from 'ricochet/core/css.mjs'

css(`
like-counter { font-weight: bold; }
`)

class LikeButton extends WComponent {
  attach () {
    this.innerHTML('<button>Like</button>')
    // the generic handler reads data-event / data-param and emits 'liked'
    this.observeDom(this.element, 'click', 'clickDatasetHandler')
  }
}
WComponent.define('like-button', LikeButton)

class LikeCounter extends WComponent {
  attach () {
    this.count = 0
    this.element.textContent = '0'
    this.listen('liked') // calls this.likedDispatched(payload)
  }

  likedDispatched (payload) {
    this.count += 1
    this.element.textContent = String(this.count) // one node, one write
  }
}
WComponent.define('like-counter', LikeCounter)

WComponent.render() // mounts the components of the page (start() does it for an application)
```

Custom elements live in the light DOM: global styles and utility classes apply to them. The former syntax,
`<div as="like-button">`, mounts the same class, so that an application can migrate one component at a time.

> **Note:** configuration items are loaded and saved by a storage adapter that the application gives to the store,
> before loading it: `config.setAdapter(adapter)`, then `await config.load()` (`ricochet/core/config.mjs`). Ricochet
> provides an adapter in memory (`ricochet/adapters/memory.mjs`); an HTTP server or Google Drive need a few lines.

The button does not know the counter exists. Add a second counter anywhere in the page and it works with no change.

## Getting started

Ricochet is a folder of plain ES modules: add it to your project (as a Git submodule or a copy), declare it in an
import map, and serve the page from any local web server.

```html
<script type="importmap">
{ "imports": { "ricochet/": "./ricochet/src/" } }
</script>
<script type="module">
  import {start} from 'ricochet/core/start.mjs'
  import {universeBrickResolver} from 'ricochet/routing/universe-brick.mjs'
  import './components/app-main.mjs'

  await start({
    root: '#root',
    storage: myAdapter, // loads and saves the configuration items
    router: universeBrickResolver({universes: {…}, bricks: {…}}),
  })
</script>
```

`start()` always runs the same steps: configuration items, current route (with its module and its scope), mounting
of the interface, then listening to the address.

The [guide](docs/GUIDE.md) explains each step, how to run the application on your computer, and how to generate the
documentation of your own components. The [API reference](docs/api/README.md) is generated from the sources.

The unit tests of the kernel run with Node.js 18 or later, without any package to install:

```sh
node tests/run.mjs            # every module, one line per suite
node tests/run.mjs WController  # one module, every assertion shown
```

The tests that need a DOM (custom elements) run in a browser: serve the folder above `ricochet/` with any local web
server and open `ricochet/tests/browser/`.

## The API at a glance

| Method | Purpose |
| --- | --- |
| `WComponent.define(tag, Class)` | Defines the custom element `<tag>` (and the former `as="tag"` attribute) with a component class. |
| `attach()` / `detach()` | Mount and optional extra cleanup. |
| `innerHTML(html)` | Replaces the component's content and mounts nested components. |
| `static observedAttributes = [names]` | Calls `nameChanged(newValue, oldValue)` after `attach()`, then on every change. |
| `listen(name)` / `emit(name, payload)` | Event bus; the handler is `nameDispatched(payload)` by convention. |
| `observeItems([items])` / `setItem(item, value)` | Configuration items; handler is `itemsChanged(items)` by convention. |
| `observeWindowEvents(type, handler)` / `observeDom(target, type, handler)` | Window and DOM events, released on detach. |
| `observeKeyboard(layer, keys)` | Registers keys for a layer: `modal`, `module`, `view`, floating groups. |
| `listen('routeChanged')` / `router.navigate(path)` | The current route at once, then each change; navigation. |
| `defer(name, payload)` / `schedule(name, payload, ms)` | Microtasks and scheduled tasks, cancelled on detach. |
| `setAnimationFrame(update, render)` | The animation of the component in the frame loop, released on detach. |
| `css(rules)` / `WComponent.css(rules)` | CSS written next to the component: one named `<style>` per call, in the page at once. |
| `release()` | Stops every subscription, timer and loop of the instance; called automatically on detach. |

The events that Ricochet emits and listens to, and the `rc` prefix reserved for its internal events, are listed in
[docs/EVENTS.md](docs/EVENTS.md); the configuration items it uses, and the `ricochet-` prefix reserved for them, in
[docs/ITEMS.md](docs/ITEMS.md).

## Also included

- **UI components** (`rc-*`), built on the colour tokens and the `data-*` actions:
  [`rc-icon`](docs/api/rc-icon.module.md), [`rc-icon-button`](docs/api/rc-icon-button.module.md),
  [`rc-checkbox`](docs/api/rc-checkbox.module.md), [`rc-radio-group` and `rc-radio`](docs/api/rc-radio.module.md)
  ([demo/components.html](demo/components.html), which also shows the mounting time); inputs, selects, tabs,
  dropdowns… to come, one at a time.
- **Palettes and themes** (`ui/theme.mjs`): components use colour tokens (`--rc-surface`, `--rc-text`,
  `--rc-danger`…), computed in `oklch()` from the palette of their block (`palette="view"`, `shade="deep"`), with a
  day and a night value (`light-dark()`). A palette is three numbers; the day/night choice is one configuration item.
  The parameters, tokens and attributes are listed in [docs/api/theme.module.md](docs/api/theme.module.md); see them
  at work in [demo/theme.html](demo/theme.html).
- **An icon set** drawn on a common 24×24 grid with uniform stroke rules.
- **A Markdown converter** for a [restricted, standard-compatible Markdown](docs/MARKDOWN.md), with hooks for
  application links.
- **A documentation generator** (`tools/doc.mjs`), usable on your own code.
- **Utilities** for the DOM, the clipboard, dates, strings, hashing and seeded random numbers.

## Browser support

Safari, Chrome and Edge (current versions). Firefox is expected to work. No polyfills, no transpilation. The kernel
uses JavaScript up to ES2022, so that it also runs in slightly older browsers and in Node.js 18.

## Roadmap

Done: the event bus, relative imports with an import map, the base classes `WController` and `WComponent`, the
layered keyboard, component styles, the store of configuration items with storage adapters, microtasks, scheduled
tasks, clocks and the frame loop, the router with a universe/brick resolver, `start()`, native Custom Elements
(`<like-button>`, light DOM) alongside the former `<div as="like-button">`, unit tests.

1. **UI components `rc-*`.** Buttons, inputs, selects, tabs, dropdowns… styled with CSS custom properties, with a
   light and a dark theme, usable on a phone screen.
2. **Storage in Google Drive.** An adapter for configuration items and data records, with IndexedDB as a cache.
3. **Documentation and a demo page.**

The design decisions behind Ricochet are recorded in [docs/DESIGN.md](docs/DESIGN.md).

## License

[MIT](LICENSE) © Rigalto — see [LICENSE](LICENSE).
