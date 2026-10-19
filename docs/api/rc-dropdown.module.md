# rc-dropdown

Module `rc-dropdown` · group `ui` · source [`src/ui/rc-dropdown.mjs`](../../src/ui/rc-dropdown.mjs)

A button that opens a window below it: a menu, a filter, a small form. The window shows above the whole page (the
top layer of the browser): no `overflow` cuts it, no `z-index` hides it.

```html
<rc-dropdown icon="filter" label="Filter" title="Filter the table">
  <rc-checkbox data-item="table-done">Done</rc-checkbox>
  <rc-text-button data-event="tableReset" data-close>Reset</rc-text-button>
</rc-dropdown>

<rc-dropdown label="Columns" content="view-shared-columns-modal" content-attr='brick="lnk"'></rc-dropdown>
```

## Button

With `icon`, the button looks like an `rc-icon-button`; without, like an `rc-text-button`. `label` is its text
(`no-label`: none), `size` the size of the icon, `flat` removes its background; `title` is its tooltip.

## Content

- **Written inside the element**: it stays in the page, hidden while the window is closed; its components keep their
  state.
- **A component named by `content`**: created when the window opens, with the attributes written in `content-attr`,
  and removed when it closes; it is new at each opening (its data are loaded again).

## Opening and closing

A click on the button opens the window, a second click closes it. The window closes on a click outside it, on
`Escape`, on a click on an element with `data-close` inside it (after the actions of that element), and on the event
`dropdownClose` (`{}`: every open dropdown; `{id}`: the dropdown with that `id`). A dropdown inside the window of
another one opens above it; `Escape` closes the window on top only.

While the window is open, it alone receives the keys (see the `keyboard` module), and the focus goes into it; it
comes back to the button when the window closes.

## Placement

The window is placed below the button, aligned on its left side; when it does not fit in the browser window, it is
moved to the left, or shown above the button. Browsers that know CSS anchor positioning (Chrome 125, Safari 26,
Firefox 147) place it themselves; for the others, the component places it, and again when the window or the content
changes size or the page scrolls. `RcDropdown.anchorPositioning` tells which is used.

## Look

The window stands on the surface of its block (`--rc-surface-raised`), with a border, rounded corners and the
shadow `--rc-elevation-3`; it keeps the palette of the dropdown.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcDropdown` | class | The component of `<rc-dropdown>`. |

## Details

### RcDropdown

The component of `<rc-dropdown>`.
