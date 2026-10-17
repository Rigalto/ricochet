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

> The bus is in place: components use `listen()` and `emit()`. Microtasks, scheduled tasks and the frame loop are
> being added (see [Roadmap](#roadmap)).

What sets it apart:

- **Reactions, not renders.** A component keeps direct references to its nodes and updates them surgically
  (`this.elLabel.textContent = …`). There is no virtual DOM, no template diffing, no render cycle.
- **Anonymous broadcast instead of a component tree.** Components never call each other and never know their parent or
  children. They publish on shared channels and subscribe to what they care about. Data does not flow "down" and events
  do not bubble "up": everything travels flat.
- **Shared state that persists by itself.** Configuration items are a reactive key/value store *and* an automatic
  save. Setting an item notifies every observer and schedules its persistence.
- **Behaviour declared in HTML.** A button needs no JavaScript to set an item, fire an event, navigate or copy text:
  `data-item`, `data-event`, `data-path`, `data-url`, `data-paste` are handled by one generic click handler.
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
| **Configuration items** | Persistent shared state: `setItem(item, value)` / `observeItems([items])`. The values are kept by a store the application registers with `setItemStore()`. |
| **Data proxy** | Complex records: create / update / delete, memory cache, change notification for observers. |

Everything a component subscribes to — events, items, attributes, window events, intervals, animation frames — is
released when it is detached. No manual cleanup in normal use.

## A quick look

```html
<div as="like-button" data-event="liked" data-param='{"id": 42}'></div>
<div as="like-counter"></div>
```

```javascript
import {WComponent} from 'ricochet/core/w-component.mjs'
import {css} from 'ricochet/core/css.mjs'

css(`
[as="like-counter"] { font-weight: bold; }
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

WComponent.render() // mounts every [as] element in <body>
```

> **Note:** a component that observes configuration items needs a store, registered once by the application with
> `setItemStore()` (`ricochet/core/items.mjs`). A store built into Ricochet, with storage adapters, is being added (see
> [Roadmap](#roadmap)).

The button does not know the counter exists. Add a second counter anywhere in the page and it works with no change.

## Getting started

Ricochet is a folder of plain ES modules: add it to your project (as a Git submodule or a copy), declare it in an
import map, and serve the page from any local web server.

```html
<script type="importmap">
{ "imports": { "ricochet/": "./ricochet/src/" } }
</script>
```

The [guide](docs/GUIDE.md) explains each step, how to run the application on your computer, and how to generate the
documentation of your own components. The [API reference](docs/api/README.md) is generated from the sources.

The unit tests of the kernel run with Node.js 18 or later, without any package to install:

```sh
node tests/run.mjs            # every module, one line per suite
node tests/run.mjs WController  # one module, every assertion shown
```

## The API at a glance

| Method | Purpose |
| --- | --- |
| `WComponent.define(tag, Class)` | Associates an `as="tag"` attribute with a component class. |
| `attach()` / `detach()` | Mount and optional extra cleanup. |
| `innerHTML(html)` | Replaces the component's content and mounts nested components. |
| `observeAttributes([names])` | Calls `nameChanged(newValue, oldValue)` now and on every change. |
| `listen(name)` / `emit(name, payload)` | Event bus; the handler is `nameDispatched(payload)` by convention. |
| `observeItems([items])` / `setItem(item, value)` | Configuration items; handler is `itemsChanged(items)` by convention. |
| `observeWindowEvents(type, handler)` / `observeDom(target, type, handler)` | Window and DOM events, released on detach. |
| `observeKeyboard(layer, keys)` | Registers keys for a layer: `modal`, `module`, `view`, floating groups. |
| `setInterval(handler, ms)` / `setAnimationFrame(handler)` | Timers and animation loops, released on detach. |
| `css(rules)` / `WComponent.css(rules)` | CSS written next to the component: one named `<style>` per call, in the page at once. |
| `release()` | Stops every subscription, timer and loop of the instance; called automatically on detach. |

## Also included

- **UI components** (`rc-*`): buttons, icon buttons, inputs, selects, checkboxes, radio buttons, sliders, tabs,
  dropdowns, alerts — all sharing the same `data-*` action contract.
- **Colour palettes** driven by CSS custom properties (`--color-*`).
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
layered keyboard, component styles, unit tests.

1. **Pluggable storage.** Configuration items and data proxies will accept storage adapters (HTTP backend, Google
   Drive, IndexedDB, plain JSON files); the store will move into the kernel.
2. **Microtasks, scheduled tasks and the frame loop.** Events deferred to the spare time of the current frame, events
   scheduled in game time or real time, and a frame loop that runs only when something needs it — so office-style
   views and a 60 fps canvas can live in the same page.
3. **Router and `start()`.** Hash routing with an application resolver and dynamic loading of modules; one entry point
   that starts the application in a fixed order.
4. **Native Custom Elements.** Move from `<div as="rc-button">` to `<rc-button>`, with `connectedCallback`,
   `disconnectedCallback` and `attributeChangedCallback` replacing the current mutation observers. Light DOM, no Shadow
   DOM, so the global palettes and utility classes keep working. Both syntaxes will coexist during the transition.
5. **Documentation and a demo page.**

The design decisions behind Ricochet are recorded in [docs/DESIGN.md](docs/DESIGN.md).

## License

[MIT](LICENSE) © Rigalto — see [LICENSE](LICENSE).
