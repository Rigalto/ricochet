# w-component

Module `w-component` · group `core` · source [`src/core/w-component.mjs`](../../src/core/w-component.mjs)

`WComponent`: a controller bound to a DOM element. An element gets its component through its `as` attribute:
`<div as="like-button">` is mounted with the class registered by `WComponent.define('like-button', LikeButton)`.

- **Mounting**: `WComponent.render(element)` mounts the element and every `[as]` element inside it; the kernel then
  calls `attach()`. `innerHTML(html)` replaces the content of the component and mounts what it holds.
- **Detaching**: when the element leaves the page, the kernel calls `detach()` if it exists, then releases every
  subscription, timer, animation loop, DOM listener and keyboard declaration of the component. An element moved
  elsewhere in the page keeps its component.
- **Attributes**: `observeAttributes(['icon', 'no-label'])` calls `iconChanged(newValue, oldValue)` and
  `noLabelChanged(…)` now and at each change.
- **Actions declared in HTML**: `clickDatasetHandler` reads `data-item`/`data-value`, `data-event`/`data-param`,
  `data-path`, `data-url` and `data-paste` on the clicked element and its parents.
- **Styles**: `WComponent.css(…)` adds CSS rules written next to the component; they are injected in batches.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `WComponent` | class | Base class of components bound to a DOM element. |
