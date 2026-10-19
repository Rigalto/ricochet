# actions

Module `actions` · group `core` · source [`src/core/actions.mjs`](../../src/core/actions.mjs)

Actions declared in HTML: a click on an element runs the actions written in its `data-*` attributes, without any
JavaScript in the component.

| Attributes | Action |
| --- | --- |
| `data-item` + `data-value` | sets a configuration item |
| `data-event` + `data-param` | emits one event, or several separated by commas; `data-param` is the JSON payload, `data-value` is added to it as `value` |
| `data-path` | navigates: `#universe/brick/…` |
| `data-url` | opens a new tab |
| `data-paste` | copies a text to the clipboard |

```html
<rc-icon-button icon="save" data-event="noteSave" data-param='{"id": 12}'>Save</rc-icon-button>
```

## Delegation

One listener, on the document, handles every click: components do not listen to clicks to run their actions.

- The **nearest** element that carries actions runs them, as a link would: going up from the clicked element, the
  first one with `data-item`, `data-event`, `data-path`, `data-url` or `data-paste`. It may combine several actions;
  the elements with actions above it do not run theirs.
- Nothing runs if the clicked element, or any element around it, has the `disabled` attribute or
  `aria-disabled="true"`: a disabled block disables everything inside.
- A component whose `data-*` attributes are not meant for clicks (an input that sets its item when it changes)
  declares `static clickActions = false`.
- A component may refuse one click: if it has an `acceptsClick(target)` method that returns `false`, nothing runs
  (a radio group, when the radio clicked is already the selected one).
- If the component of the element has a `notify(event, dataset)` method, it is called after the actions.
- A component that changes its state on a click (a checkbox) does it in its own click listener: it runs before the
  listener of the document, so that the actions see the new state (`data-value`).
- The click goes on: the listeners of the components still receive it.

**Migration.** The elements mounted with the former syntax (`as="…"`), and the plain elements inside them, keep the
former behaviour: their clicks are left to their own handlers (`clickDatasetHandler`). A custom element inside them,
such as an `rc-icon-button`, runs its actions.

The listener is added when the module is imported.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `runActions` | function | Runs the actions of a `dataset`. |
| `isDisabled` | function | Whether an element is disabled: it, or any element around it, has the `disabled` attribute or `aria-disabled="true"`. |
| `actionElement` | function | The element whose actions a click runs, or `null`. |

## Details

### runActions()

Runs the actions of a `dataset`.

| Parameter | Type | Description |
| --- | --- | --- |
| `dataset` | DOMStringMap\|object | The `dataset` of an element, or an object with the same keys. |

### isDisabled()

Whether an element is disabled: it, or any element around it, has the `disabled` attribute or
`aria-disabled="true"`.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | Element | An element. |

**Returns** `boolean` True if the element is disabled.

### actionElement()

The element whose actions a click runs, or `null`.

| Parameter | Type | Description |
| --- | --- | --- |
| `target` | Element | The clicked element. |

**Returns** `Element|null` The nearest element with actions, unless it is disabled.
