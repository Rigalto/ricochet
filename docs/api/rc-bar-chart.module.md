# rc-bar-chart

Module `rc-bar-chart` · group `ui` · source [`src/ui/rc-bar-chart.mjs`](../../src/ui/rc-bar-chart.mjs)

A bar chart, drawn in SVG: one bar per value, a vertical scale, labels under the bars, and marks that separate
groups of bars (a month, a year). The application gives the bars; the chart draws them with the colours of the
theme. Too many bars for the width: the chart scrolls horizontally, shown at its end (the last bars).

```html
<rc-bar-chart label="Tasks completed per day" height="160"></rc-bar-chart>
```

```javascript
chart._component.bars = [
  {value: 3, label: '26', title: 'Thursday 26/11: 3'},
  {value: 5, label: '27', title: 'Friday 27/11: 5', mark: 'Dec. 2026'}
]
```

## The bars

`bars` (property of the component, `element._component.bars`) is an array of objects:

| Key | Use |
| --- | --- |
| `value` | The height of the bar (a number, 0 or more; another value counts as 0). |
| `label` | A short text under the bar (`'27'`); empty: none. The application gives one every few bars when they are many. |
| `title` | The text shown when the mouse is on the bar (default: the value). |
| `mark` | A text that starts a group at this bar (`'Dec. 2026'`): a vertical line before the bar, the text under the labels (left out when it would cover the text of the previous mark). |

Giving `bars` again draws the chart again. No bar: the chart shows `empty` (default `No data`).

## The scale

The top of the scale is the highest value rounded up to 1, 2 or 5 times a power of ten (`niceMax`); three lines
cross the chart, with their values on the left. The value of each bar is written above it with `values`.

## Size and look

`height` (default 160) is the height of the drawing in pixels; `bar-width` (default 14) the width of a bar, with a
gap of a third of it. The chart takes the width of `rc-bar-chart`, set by the application; wider, it scrolls. The
bars are in `--rc-selected`, the lines and texts in `--rc-border` and `--rc-text-muted`. `label` names the chart for
screen readers.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `niceMax` | function | The top of a scale: the highest value rounded up to 1, 2 or 5 times a power of ten; 1 at least. |
| `RcBarChart` | class | The component of `<rc-bar-chart>`. |

## Details

### niceMax()

The top of a scale: the highest value rounded up to 1, 2 or 5 times a power of ten; 1 at least.

| Parameter | Type | Description |
| --- | --- | --- |
| `max` | number | The highest value. |

**Returns** `number` 

### RcBarChart

The component of `<rc-bar-chart>`.
