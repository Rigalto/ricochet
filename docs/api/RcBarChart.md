# RcBarChart

Class `RcBarChart` extends [`WComponent`](WComponent.md) · element `<rc-bar-chart>` · group `ui` · source [`src/ui/rc-bar-chart.mjs`](../../src/ui/rc-bar-chart.mjs)

The component of `<rc-bar-chart>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `height` | in | `number` = `160` | Height of the drawing, in pixels. |
| attribute | `bar-width` | in | `number` = `14` | Width of a bar, in pixels. |
| attribute | `values` | in | `boolean` | The value of each bar is written above it. |
| attribute | `empty` | in | `string` = `No data` | Text shown without bars. |
| attribute | `label` | in | `string` | Name of the chart for screen readers. |

## Methods

### get bars

The bars: `[{value, label?, title?, mark?}]`.
