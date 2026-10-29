# rc-month

Module `rc-month` · group `ui` · source [`src/ui/rc-month.mjs`](../../src/ui/rc-month.mjs)

The grid of a month: the names of the days, then the weeks, Monday first, each day a button. A click on a day emits
the event named by the `event` attribute, with the date as payload: `{date: '2026-10-29'}` (see the `actions`
module). The navigation between months (previous, next, today) is the business of the block around it: it changes
the `month` attribute.

```html
<rc-month month="2026-10" value="2026-10-29" event="calendarDate" labels="Lu, Ma, Me, Je, Ve, Sa, Di"></rc-month>
```

## Attributes

| Attribute | Role |
| --- | --- |
| `month` | the month shown, `YYYY-MM` or `YYYY-MM-DD` (the day is ignored); default: the month of `value`, else the current month |
| `value` | the chosen date, `YYYY-MM-DD`, shown filled in `--rc-selected` when it is in the weeks shown |
| `today` | the date of today, `YYYY-MM-DD`, circled; default: the date of the computer; `none`: not shown |
| `weeks` | `6` (default): six weeks always; `auto`: the room of six weeks, the last weeks hidden when all their days are outside the month; `compact`: four to six weeks, the height changes with the month |
| `event` | the name of the event emitted by a click on a day |
| `labels` | the seven names of the days, Monday first, separated by `,`, `, ` or `|`; default: `Mo, Tu, We, Th, Fr, Sa, Su` |

The days of the previous and the next month are shown faint, and can be clicked like the others.

## Changes

The grid is built once: seven names and forty-two buttons. After that, a change of an attribute changes the
buttons in place:

- another `value` or `today`: the mark moves from one button to another;
- another `month`: the number of each button, its date (`data-param`) and its faint state are rewritten, and the
  last weeks are shown or hidden according to `weeks`.

## Keyboard and screen readers

The grid is a `grid`; each day is a `gridcell`, with `aria-selected` on the chosen date and the full date as its
name. `Tab` reaches one day only: the chosen date, else today, else the first day of the month. Then the arrows move
between the days (`←` `→` one day, `↑` `↓` one week, `Home` `End` the first and last day of the week), the focus ring
showing where the keyboard is; `Enter` or `Space` clicks the day.

## Look

The colours come from the palette of the block: the names of the days in `--rc-text-muted`, the days of the month in
`--rc-text-strong`, the other days in `--rc-text-faint`; the chosen date filled with `--rc-selected`, today circled
with it. The days are round; their size follows the width of the grid.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcMonth` | class | The component of `<rc-month>`. |

## Details

### RcMonth

The component of `<rc-month>`.
