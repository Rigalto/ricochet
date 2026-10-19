# rc-textarea

Module `rc-textarea` · group `ui` · source [`src/ui/rc-textarea.mjs`](../../src/ui/rc-textarea.mjs)

A field of several lines, whose height follows its content. It is an `rc-input` with a `<textarea>`: the same value,
actions, validation and look (see the `rc-input` module).

```html
<rc-textarea data-item="note-text" rows="3" max-rows="12" placeholder="Write a note"></rc-textarea>
<rc-textarea commit="change" data-event="cardText" data-param='{"id": 42}'></rc-textarea>
```

## Height

The field grows and shrinks with its text, between `rows` lines (default 2) and `max-rows` lines (default: no
limit); beyond `max-rows`, it scrolls. The user does not resize it by hand. Its width is the width of
`rc-textarea`, set by the application.

The browsers that know the CSS property `field-sizing` (Chrome and Edge 123, Safari 26.2, Firefox 152) size the field
themselves. For the others, the component measures the text at each change, and again when the width of the field
changes or when it appears (a field inside a hidden block has no size until the block is shown).

## Differences with rc-input

- `Enter` starts a new line: with `commit="enter"`, the actions run on `Ctrl` + `Enter` (`⌘` + `Enter` on a Mac);
  with `commit="change"`, when the field is left or on `Ctrl` + `Enter`.
- No `type`, `min` nor `max`; `pattern`, `check`, `required`, `maxlength`, `placeholder`, `readonly`, `disabled` and
  `label` are the same.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcTextarea` | class | The component of `<rc-textarea>`. |

## Details

### RcTextarea

The component of `<rc-textarea>`.
