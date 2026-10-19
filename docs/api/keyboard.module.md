# keyboard

Module `keyboard` · group `core` · source [`src/core/keyboard.mjs`](../../src/core/keyboard.mjs)

Centralised, layered keyboard handling. A key press is handled by the highest layer that listens for it:

1. an **alert**, when one is shown: no other layer receives keys;
2. a **modal** (dropdown), when one is open: `Escape` closes it;
3. the **module** that has the keyboard focus, if any: `Escape` releases the focus;
4. the **floating buttons**, all groups together;
5. the **view**, if no floating button handled the key.

Keys typed in an `<input>`, a `<textarea>` or a `<select>` are left to the browser, and so are `Tab`, `Space` and
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
| event | `dropdownOpen` | in |  | A modal opens: it takes the keyboard. |
| event | `dropdownClose` | in |  | The modal closes: its keys are forgotten. |
| event | `moduleFocus` | in | `{module: string}` | A module takes the keyboard focus (`''`: none). |
| event | `dropdownClose` | out |  | `Escape` pressed while a modal is open. |
| event | `moduleFocus` | out | `{module: string}` | `Escape` pressed while a module has the focus (`module: ''`). |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `KeyboardController` | class | The keyboard controller. One instance, `keyboard`, serves the whole application. |
| `keyboard` | const | The keyboard controller of the application. |
