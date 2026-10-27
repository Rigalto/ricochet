# RcCrumb

Class `RcCrumb` extends [`WComponent`](WComponent.md) · element `<rc-crumb>` · group `ui` · source [`src/ui/rc-breadcrumb.mjs`](../../src/ui/rc-breadcrumb.mjs)

The component of `<rc-crumb>`: a step of a breadcrumb.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `icon` | in | `string` | Icon before the text. |
| attribute | `prefix` | in | `string` | Short text before the label, always shown. |
| attribute | `label` | in | `string` | Text of the step, hidden when the line is too short. |
| attribute | `title` | in | `string` | Tooltip; default, when the label is hidden: the label. |
| attribute | `keep` | in | `boolean` | The label is never hidden. |
| attribute | `disabled` | in | `boolean` | The button cannot be clicked. |
| attribute | `collapsed` | in | `boolean` | Set by `rc-breadcrumb`: the label is hidden. |
| attribute | `data-*` | in | `string` | Actions run by a click (see the `actions` module); without them, the crumb is a text. |
