# rc-text-button

Module `rc-text-button` · group `ui` · source [`src/ui/rc-text-button.mjs`](../../src/ui/rc-text-button.mjs)

A button made of text, or of any content: a click runs the actions of its `data-*` attributes (see the `actions`
module).

```html
<rc-text-button data-event="gameStart">Start the game</rc-text-button>
<rc-text-button flat data-path="#books">Books</rc-text-button>
<rc-text-button link data-url="https://example.com">Read more</rc-text-button>
<rc-text-button palette="action" class="rc-shadow-2 rc-text-shadow" data-event="formSave">Save</rc-text-button>
```

- **Content**: what is written inside the element, moved into a `<button>`; it may hold other elements, such as an
  `rc-icon`. The `label` attribute replaces it with a text.
- **Look** (see the `button-style` module): by default, the button stands on the surface of its block; `flat`
  removes the background and the border (a breadcrumb); `link` shows a link; `palette` and `shade` give it the
  surface of a palette, for an action that stands out.
- **Keyboard**: a real `<button>`: it takes the focus with `Tab`, and `Enter` or `Space` click it.
- **Disabled**: with the `disabled` attribute, the button cannot be clicked and its actions do not run.

An application gives its buttons a look of its own with a palette of its own, which may set tokens directly, its own
classes, and the shadow classes of the `theme` module:

```css
[palette="action"] {
  --rc-surface: light-dark(oklch(48% .12 235), oklch(42% .1 235));
  --rc-text: oklch(98% .01 235);
}
```

Centring a button, or giving it a width, is the layout of the application: its CSS sets them on `rc-text-button`.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcTextButton` | class | The component of `<rc-text-button>`. |

## Details

### RcTextButton

The component of `<rc-text-button>`.
