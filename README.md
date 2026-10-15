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

What sets it apart:

- **Reactions, not renders.** A component keeps direct references to its nodes and updates them surgically
  (`this.elLabel.textContent = …`). There is no virtual DOM, no template diffing, no render cycle.
- **Anonymous broadcast instead of a component tree.** Components never call each other and never know their parent or
  children. They publish on shared channels and subscribe to what they care about. Data does not flow "down" and events
  do not bubble "up": everything travels flat.
- **Shared state that persists by itself.** Configuration items are a reactive key/value store *and* an automatic,
  debounced save. Setting an item notifies every observer and schedules its persistence.
- **Behaviour declared in HTML.** A button needs no JavaScript to set an item, fire an event, navigate or copy text:
  `data-item`, `data-event`, `data-path`, `data-url`, `data-paste` are handled by one generic click handler.
- **Centralised, layered keyboard handling.** Alert › modal › focused module › floating buttons › view: each key press
  goes to the highest layer that listens for it, and to no one else.
- **Built-in instrumentation.** Leak counters (attached components, listeners, timers, animation frames) and timelines of
  events, configuration changes and network requests, readable from the console or from a debug view.
- **Zero dependencies, zero build.** Plain ES modules. The code you write is the code the browser runs.

## Core concepts

Ricochet has two base classes and three communication channels.

| Concept | Role |
| --- | --- |
| `WComponent` | Bound to a DOM element. Many instances. Mounts with `attach()`, cleans up automatically when the element leaves the DOM. |
| `WController` | No DOM. A singleton created when its module is imported (keyboard, data proxies, business logic). Same API as `WComponent` for signals. |
| **Event bus** | Volatile signals: `dispatchEvent(name, detail)` / `observeEvents(name)`. |
| **Configuration items** | Persistent shared state: `setItem(item, value)` / `observeItems([items])`. Observers are called in batches (20 ms); persistence is debounced (2 s). |
| **Data proxy** | Complex records: create / update / delete, memory cache, change notification for observers. |

Everything a component subscribes to — events, items, attributes, window events, intervals, animation frames — is
released when it is detached. No manual cleanup in normal use.

## A quick look

```html
<div as="like-button" data-event="liked" data-param='{"id": 42}'></div>
<div as="like-counter"></div>
```

```javascript
import {WComponent} from './web-components/web-wcomponent.mjs'

WComponent.css(/* css */`
[as="like-counter"] { font-weight: bold; }
`)

class LikeButton extends WComponent {
  attach () {
    this.innerHTML('<button>Like</button>')
    // the generic handler reads data-event / data-param and dispatches 'liked'
    this.element.addEventListener('click', this.clickDatasetHandler)
  }
}
WComponent.define('like-button', LikeButton)

class LikeCounter extends WComponent {
  attach () {
    this.count = 0
    this.element.textContent = '0'
    this.observeEvents('liked') // calls this.likedDispatched(e)
  }

  likedDispatched (e) {
    this.count += 1
    this.element.textContent = String(this.count) // one node, one write
  }
}
WComponent.define('like-counter', LikeCounter)

WComponent.render() // mounts every [as] element in <body>
```

> **Note:** the kernel currently expects a `window.$global` bootstrap object (debug flags, logs, leak counters, configuration
> store) to be defined before it loads. A minimal `index.html` will be provided; this requirement will be removed.

The button does not know the counter exists. Add a second counter anywhere in the page and it works with no change.

## The API at a glance

| Method | Purpose |
| --- | --- |
| `WComponent.define(tag, Class)` | Associates an `as="tag"` attribute with a component class. |
| `attach()` / `detach()` | Mount and optional extra cleanup. |
| `innerHTML(html)` | Replaces the component's content and mounts nested components. |
| `observeAttributes([names])` | Calls `nameChanged(newValue, oldValue)` now and on every change. |
| `observeEvents(name)` / `dispatchEvent(name, detail)` | Event bus; handler is `nameDispatched(e)` by convention. |
| `observeItems([items])` / `setItem(item, value)` | Configuration items; handler is `itemsChanged(items)` by convention. |
| `observeWindowEvents(name, handler)` | Window events, released on detach. |
| `observeKeyboard(layer, keys)` | Registers keys for a layer: `modal`, `module`, `view`, floating groups. |
| `setInterval(handler, ms)` / `setAnimationFrame(handler)` | Timers and animation loops, released on detach. |
| `WComponent.css(css)` | Component CSS written next to the component, injected in batches, with `@apply` support. |

## Also included

- **UI components** (`mui-*`): buttons, icon buttons, inputs, selects, checkboxes, radio buttons, sliders, tabs,
  dropdowns, alerts — all sharing the same `data-*` action contract.
- **Colour palettes** driven by CSS custom properties (`--color-*`).
- **An icon set** drawn on a common 24×24 grid with uniform stroke rules.
- **Utilities** for dates, strings, hashing and seeded random numbers.

## Browser support

Safari, Chrome and Edge (current versions). Firefox is expected to work. No polyfills, no transpilation.

## Roadmap

1. **Native Custom Elements.** Move from `<div as="mui-button">` to `<mui-button>`, with `connectedCallback`,
   `disconnectedCallback` and `attributeChangedCallback` replacing the current mutation observers. Light DOM, no Shadow
   DOM, so the global palettes and utility classes keep working. Both syntaxes will coexist during the transition.
2. **Pluggable storage.** Configuration items and data proxies currently persist through a small HTTP backend. They will
   accept storage adapters (Google Drive, IndexedDB, plain JSON files).
3. **Relative imports and an import map**, so the kernel can be loaded from any host, including GitHub Pages.
4. **Documentation and a demo page.**

## License

[MIT](LICENSE) © Didier CABUZEL — see [LICENSE](LICENSE).
