# w-component

Module `w-component` · group `core` · source [`src/core/w-component.mjs`](../../src/core/w-component.mjs)

`WComponent`: a controller bound to a DOM element. `WComponent.define('like-button', LikeButton)` registers the
class for two syntaxes, which may be mixed in the same page:

- the **custom element** `<like-button>`, a native Custom Element in light DOM (no Shadow DOM): the browser mounts
  it as soon as it is in the page and its class is defined, even if the element was inserted before its module was
  loaded;
- the **attribute** `<div as="like-button">` (or `<span as="…">`), mounted by `WComponent.render()`: the former
  syntax, kept during the migration.

In both cases `this.element` is the element, and the component does the same work.

- **Mounting**: the kernel creates the component, then calls `attach()`. `WComponent.render(element)` mounts the
  `[as]` elements of a subtree; `innerHTML(html)` replaces the content of the component and mounts what it holds.
  Custom elements are mounted by the browser, but not before the first `WComponent.render()` (called by `start()`):
  those of the initial page wait until the configuration items and the route are ready.
- **Detaching**: when the element leaves the page, the kernel releases every subscription, timer, animation, task,
  DOM listener and keyboard declaration of the component, then calls `detach()` if it exists. An element moved
  elsewhere in the page keeps its component.
- **Attributes**: a class that declares `static observedAttributes = ['icon', 'no-label']` gets
  `iconChanged(newValue, oldValue)` and `noLabelChanged(…)` called after `attach()` with the current values, then at
  each change: through `attributeChangedCallback` for a custom element, through a mutation observer for an `[as]`
  element. `observeAttributes()` does the same from `attach()`.
- **Display**: a custom element is `inline` for the browser, like a `<span>`. The kernel gives each defined element
  `display: block`, like a `<div>`, in the `ricochet` cascade layer: the CSS of the application or of the component
  wins over it. A class may choose another value with `static display = 'inline'` (or `'flex'`, `'contents'`…).
- **Actions declared in HTML**: `clickDatasetHandler` reads `data-item`/`data-value`, `data-event`/`data-param`,
  `data-path`, `data-url` and `data-paste` on the clicked element and its parents.
- **Styles**: `WComponent.css(…)` adds CSS rules written next to the component (see the `css` module).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `WComponent` | class | Base class of components bound to a DOM element. |
