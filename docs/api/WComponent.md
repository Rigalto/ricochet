# WComponent

Class `WComponent` extends [`WController`](WController.md) · group `core` · source [`src/core/w-component.mjs`](../../src/core/w-component.mjs)

Base class of components bound to a DOM element.

## Methods

### constructor(element)

Created by the kernel when the element is mounted; components do their setup in `attach()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | Element | The element of the component. |

### static define(tag, component)

Registers the class of the components of a tag: the custom element `<tag>` and the elements with `as="<tag>"`
are mounted with it. The tag must contain a `-` (`like-button`), as every custom element name.

| Parameter | Type | Description |
| --- | --- | --- |
| `tag` | string | Name of the custom element, and value of the `as` attribute. |
| `component` | Function | Class extending `WComponent`. |

### static _detach(element)

Detaches the component of an element: `detach()`, then release of everything it subscribed to. Kernel internal.

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | Element | Element whose component is detached. |

### static _elementName(element)

Debugging: the tag name of an element followed by its classes (`div.styled-palette`).

| Parameter | Type | Description |
| --- | --- | --- |
| `element` | Element | The element. |

**Returns** `string` The description.

### _attributeChanged(attribute, newValue, oldValue)

Calls the method of an attribute (`no-label` → `noLabelChanged`). Kernel internal.

| Parameter | Type | Description |
| --- | --- | --- |
| `attribute` | string | Attribute name. |
| `newValue` | string\|null | New value. |
| `oldValue` | string\|null | Former value. |

### static render(element = document.body)

Mounts the components of an element and of every `[as]` element inside it. The first call also mounts the
custom elements already in the page: until then, they wait, so that the application decides when its interface
appears (`start()` calls it once the configuration items and the route are ready).

At the end of the task, a custom element of the content that no module defines is reported in the console, once
per tag: the module of its component is not imported. With `$global.debug.strict`, the error is thrown.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `element` | Element | `document.body` | Root of the elements to mount. `<body>` itself must not have `as`. |

### innerHTML(html)

Replaces the content of the component, then mounts the components it holds.

| Parameter | Type | Description |
| --- | --- | --- |
| `html` | string | The new content. |

### static css(rules, options)

Adds CSS rules to the page, in a `<style>` element of their own. Same as `css()` of the `css` module.

| Parameter | Type | Description |
| --- | --- | --- |
| `rules` | string | Complete CSS rules, with their selectors and braces. |
| `options` | {name: string, layer: string} | Name of the block and cascade layer (see `css()`). |

**Returns** `HTMLStyleElement|null` The `<style>` element.

### handleDataset(dataset)

Runs the actions declared by the `data-*` attributes of an element: `data-item` + `data-value` set a
configuration item, `data-event` (one or more names, separated by commas) + `data-param` (JSON) emit events,
`data-path` navigates, `data-url` opens a new tab, `data-paste` copies a text.

| Parameter | Type | Description |
| --- | --- | --- |
| `dataset` | DOMStringMap | The `dataset` of the element. |

### clickDatasetHandler(e)

Click handler that runs the `data-*` actions of the clicked element and of its parents, up to the element that
listens, and calls their `notify(event, dataset)` method if they have one. Components of the former API use it;
the click then stops there. The new components need no handler: see the `actions` module.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | MouseEvent | The click. |

### doubleClickHandler(e)

Tells a single click from a double click: calls `singleClick(e)` 400 ms after a click, or `doubleClick(e)` if a
second click comes first.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | Event | The click. |

### observeAttributes(attributes, handlerName)

Observes attributes of the element: `<attribute>Changed(newValue, oldValue)` is called now, with the current
value, then at each change (`no-label` → `noLabelChanged`). With a method name, that method is called for every
attribute of the list, with `(newValue, oldValue, attribute)`: for attributes known only when the component runs.
Several calls add up.

| Parameter | Type | Description |
| --- | --- | --- |
| `attributes` | string\|string[] | Attribute name, or an array of names. |
| `handlerName` | string | Method called for all these attributes. |

### unobserveAttributes()

Stops observing the attributes of the element.

### observeKeyboard(layer, keysOrName, moduleKeys)

Declares the keys handled by the component in a keyboard layer (see the `keyboard` module). The keys of a
module or of the view are forgotten when the component is detached.

| Parameter | Type | Description |
| --- | --- | --- |
| `layer` | string | `modal`, `module`, `view`, or a group of floating buttons: `arrows`, `card`, `link`. |
| `keysOrName` | * | The keys; for `module`, the module name. |
| `moduleKeys` | Array | For `module`: the keys. |
