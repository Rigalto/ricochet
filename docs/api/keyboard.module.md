# keyboard

Module `keyboard` · group `core` · source [`src/core/keyboard.mjs`](../../src/core/keyboard.mjs)

Centralised, layered keyboard handling. A key press is handled by the highest layer that listens for it:

1. the **window open on top** (a dropdown, a dialog, an alert), when one is open: it alone receives the keys;
2. the **module** that has the keyboard focus, if any: `Escape` releases the focus;
3. the **floating buttons**, all groups together;
4. the **view**, if no floating button handled the key.

## Windows

The windows that open above the page form a stack: a window calls `openLayer(owner, keys)` when it opens and
`closeLayer(owner)` when it closes. The window on top receives every key: those it declares run their actions, the
others are dropped; `Escape` is a key it declares like any other (close, cancel). Each change of the stack emits
`overlayChanged {open}`, with the number of open windows: an application hides what must not show above a window.
The layers of a component are closed when it is detached.

The former API stays, deprecated: the events `dropdownOpen` and `dropdownClose` open and close a window whose
`Escape` emits `dropdownClose` and whose keys are given by `setModalKeys()`; `setAlertKeys()` opens (or closes, with
`null`) a window for an alert.

Keys typed in an `<input>`, a `<textarea>` or a `<select>` are left to the browser, except `Escape` while a window
is open (a dropdown with a field closes on `Escape`, as the window of the browser would); so are `Tab`, `Space` and
`Enter` when a control has the focus (a button, a link, an element with `tabindex`): they move the focus or press the
control. The arrows, `Home` and `End` are left to the component when a radio button or a tab has the focus
(`role="radio"`, `role="tab"`): they move in its group.

## Declaring keys

Each layer receives an array of `{key, action}` objects. `key` is a string, an array of strings or a regular
expression, matched against the key written as `Ctrl-Shift-Alt-<key>` (modifiers in this order, only those
pressed): `u`, `Shift-U`, `Ctrl-u`, `Alt-Shift-U`, `ArrowRight`, `0` to `9` and `.` for the numeric keypad,
`Shift-0` for the main keyboard… `action` holds what to do:

- `event` and `param`: emits the event, with `param` plus `key`, `shift`, `ctrl` and `alt` as payload;
- `item` and `value`: sets a configuration item;
- `click`: an element to click.

The default action of the browser is prevented for every handled key, and always for `Space`, the arrows, `Tab`
and `Alt`.

## Keys currently pressed

Games read the keys held down at any time: `keyboard.keyboard` holds physical codes (`KeyA`, `ShiftLeft`,
`ArrowUp`… — the `z` key of a French keyboard is `KeyW`), `keyboard.keys` holds characters as typed. Nothing is
recorded while `Ctrl` is pressed.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| event | `dropdownOpen` | in |  | Deprecated: a window of the former API opens. |
| event | `dropdownClose` | in |  | Deprecated: the window of the former API closes. |
| event | `moduleFocus` | in | `{module: string}` | A module takes the keyboard focus (`''`: none). |
| event | `dropdownClose` | out |  | Deprecated: `Escape` pressed while a window of the former API is open. |
| event | `overlayChanged` | out | `{open: number}` | A window opened or closed: `open` windows are open. |
| event | `moduleFocus` | out | `{module: string}` | `Escape` pressed while a module has the focus (`module: ''`). |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `KeyboardController` | class | The keyboard controller. One instance, `keyboard`, serves the whole application. |
| `keyboard` | const | The keyboard controller of the application. |
