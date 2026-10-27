# rc-breadcrumb

Module `rc-breadcrumb` · group `ui` · source [`src/ui/rc-breadcrumb.mjs`](../../src/ui/rc-breadcrumb.mjs)

A breadcrumb: `rc-breadcrumb` holds `rc-crumb` elements, each a step of the path, shown on one line with a
separator between them. A crumb with `data-*` actions is a button (see the `actions` module): a click goes back to
that step.

```html
<rc-breadcrumb>
  <rc-crumb icon="home" label="Home" data-path="#hom/pln/table"></rc-crumb>
  <rc-crumb icon="book" prefix="1.2" label="The arrival" data-path="#rom/chp/table"></rc-crumb>
  <rc-crumb prefix="1.2.4" label="At the harbour"></rc-crumb>
</rc-breadcrumb>
```

## Crumbs

| Attribute of `rc-crumb` | Role |
| --- | --- |
| `icon` | icon before the text |
| `prefix` | short text before the label, always shown: a number (`1.2.4`), an id (`[12]`) |
| `label` | text of the step; hidden when the line is too short |
| `title` | tooltip; default, when the label is hidden: the label |
| `keep` | the label is never hidden |
| `disabled` | the button cannot be clicked |
| `data-*` | actions of a click; without them, the crumb is a text |

Any other element may stand in the line, between the crumbs: an `rc-dropdown`, to choose among the steps of the same
level. It gets its separator; its text is never hidden.

## Short lines

When the line is longer than its place, the labels are hidden one by one, from the first crumb towards the end,
until it fits; the icon and the prefix stay, and the hidden label becomes the tooltip. The label of the last crumb
(where the user is) is hidden last: it is cut with an ellipsis instead. The labels come back when the place grows.
A crumb whose label is hidden has the attribute `collapsed`.

The line takes the width that its parent gives it: in a grid or a flex container, its cell must allow it to shrink
(`min-width: 0`).

## Look

The crumbs that are buttons are flat buttons (see the `button-style` module); the separator is `›`, in
`--rc-text-faint`, or the text of the `separator` attribute of `rc-breadcrumb`.

## Keyboard and screen readers

`rc-breadcrumb` is a `navigation` named by its `label` attribute (default: `Breadcrumb`); the last crumb has
`aria-current="page"`. The crumbs that are buttons take the focus with `Tab`.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcCrumb` | class | The component of `<rc-crumb>`: a step of a breadcrumb. |
| `RcBreadcrumb` | class | The component of `<rc-breadcrumb>`. |

## Details

### RcCrumb

The component of `<rc-crumb>`: a step of a breadcrumb.

### RcBreadcrumb

The component of `<rc-breadcrumb>`.
