# RcMonth

Class `RcMonth` extends [`WComponent`](WComponent.md) · element `<rc-month>` · group `ui` · source [`src/ui/rc-month.mjs`](../../src/ui/rc-month.mjs)

The component of `<rc-month>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `month` | in | `string` | The month shown, `YYYY-MM` or `YYYY-MM-DD`. |
| attribute | `value` | in | `string` | The chosen date, `YYYY-MM-DD`. |
| attribute | `today` | in | `string` | The date of today, `YYYY-MM-DD`, or `none`. |
| attribute | `weeks` | in | `string` = `6` | `6`, `auto` or `compact`. |
| attribute | `event` | in | `string` | The event emitted by a click on a day, with `{date}` as payload. |
| attribute | `labels` | in | `string` | The seven names of the days, Monday first. |

## Methods

### keyPressed(e)

The arrows, `Home` and `End` move the focus between the days.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | KeyboardEvent | The key pressed in the grid. |
