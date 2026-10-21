# rc-dialog

Module `rc-dialog` · group `ui` · source [`src/ui/rc-dialog.mjs`](../../src/ui/rc-dialog.mjs)

A modal window: a native `<dialog>`, shown above the page, which is greyed and cannot be used until the window
closes. The window closes with the value of the button chosen, and then runs the actions of its `data-*` attributes
(see the `actions` module) with this value in `data-value`: a dialog is a field whose value is the button chosen.

```html
<rc-dialog id="delete" label="Delete the card" data-event="cardDelete" data-param='{"id": 42}'>
  <p>The card will be deleted.</p>
  <footer>
    <rc-text-button data-close="cancel">Cancel</rc-text-button>
    <rc-text-button data-close="ok" default palette="action">Delete</rc-text-button>
  </footer>
</rc-dialog>

<rc-icon-button icon="trash" data-dialog="delete">Delete</rc-icon-button>
```

## Opening

The window opens when it gets the `open` attribute: from the action `data-dialog="id"` of any element, or from
the application. Removing `open` closes it, with the value `''`.

## Closing

| How | Value |
| --- | --- |
| a click on an element with `data-close`, after the actions of that element | the value of `data-close` |
| `Escape` | `cancel` |
| a click outside the window, with `closedby="any"` | `cancel` |
| `Enter`, when the focus is on no button nor field | the element with `default` is clicked |

When it closes, the dialog runs its actions with the value: `data-event` emits the event with `value` added to the
payload, `data-item` sets the item. The `value` property of the component is the value of the last closing.

## Content

`label` is the title of the window. The content written in the element is the body; a `<footer>` in it holds the
buttons, on the right. The focus goes to the element with `autofocus`, or to the first button or field.

## Alerts and confirmations

`showAlert()` and `showConfirm()` show a message in a window shared by the application, without writing it:

```js
import {showConfirm} from 'ricochet/ui/rc-dialog.mjs'

showConfirm({title: 'Delete', message: 'The card will be deleted.', ok: 'Delete', event: 'cardDelete', param: {id: 42}})
// the event cardDelete is emitted with {id: 42, value: 'ok'} or {id: 42, value: 'cancel'}
```

## Keyboard and look

While the window is open, it alone receives the keys (see the `keyboard` module), and `Tab` stays inside it. The
window stands on `--rc-surface-raised`, with the shadow `--rc-elevation-3`; it keeps the palette of the dialog
(`palette` on `rc-dialog`).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcDialog` | class | The component of `<rc-dialog>`. |
| `showAlert` | function | Shows a message, with one button. |
| `showConfirm` | function | Asks a confirmation, with two buttons; the answer is an event. |

## Details

### RcDialog

The component of `<rc-dialog>`.

### showAlert()

Shows a message, with one button.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | object |  | The message. |
| `options.title` | string |  | Title of the window. |
| `options.message` | string |  | The message, as text. |
| `options.ok` | string | `OK` | Label of the button. |
| `options.event` | string |  | Event emitted when the window closes, with `value` (`ok` or `cancel`). |
| `options.param` | object |  | Payload of the event. |

### showConfirm()

Asks a confirmation, with two buttons; the answer is an event.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | object |  | The question. |
| `options.title` | string |  | Title of the window. |
| `options.message` | string |  | The question, as text. |
| `options.ok` | string | `OK` | Label of the button that confirms. |
| `options.cancel` | string | `Cancel` | Label of the button that cancels. |
| `options.event` | string |  | Event emitted when the window closes, with `value`: `ok` or `cancel`. |
| `options.param` | object |  | Payload of the event. |
