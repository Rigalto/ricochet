# RcBreadcrumb

Class `RcBreadcrumb` extends [`WComponent`](WComponent.md) · element `<rc-breadcrumb>` · group `ui` · source [`src/ui/rc-breadcrumb.mjs`](../../src/ui/rc-breadcrumb.mjs)

The component of `<rc-breadcrumb>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `separator` | in | `string` | Text between two crumbs; default: `›`. |
| attribute | `label` | in | `string` | Name of the navigation for screen readers; default: `Breadcrumb`. |

## Methods

### fit()

Shows every label, then hides them one by one, from the first crumb, until the line fits in its width. Called by
the component when the width or the crumbs change; an application calls it after a change that the component
cannot see (a font loaded later).
