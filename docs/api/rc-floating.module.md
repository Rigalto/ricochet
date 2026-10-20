# rc-floating

Module `rc-floating` · group `ui` · source [`src/ui/rc-floating.mjs`](../../src/ui/rc-floating.mjs)

Floating buttons: round buttons that stay at the bottom of the screen while the view scrolls, for the actions of
the view (next card, edit, save…).

```html
<rc-floating-bar>
  <rc-floating-group name="arrows" class="arrows">
    <rc-floating-button icon="caretleft" key="Ctrl-ArrowLeft" title="Previous card" data-path="#…"></rc-floating-button>
    <rc-floating-button icon="caretright" key="Ctrl-ArrowRight" title="Next card" data-path="#…"></rc-floating-button>
  </rc-floating-group>
  <rc-floating-group name="card" side="right" gradient="right">
    <rc-floating-button icon="trash" key="Ctrl-Backspace" data-event="cardDelete"></rc-floating-button>
    <rc-floating-button icon="pen" key="Ctrl-m" data-event="cardEdit"></rc-floating-button>
  </rc-floating-group>
</rc-floating-bar>
```

## Place

`rc-floating-bar` is the line of the buttons. It is written at the end of the content of the view: while the view
is longer than the screen, the line sticks to the bottom of the screen, above the content (`position: sticky`); at
the end of the view, it takes its own place below the content, so that the buttons never hide the end of the view.
It has the width of the column of the view: the buttons on the right follow the right side of the view.

The bar is hidden while a window is open above the page (`overlayChanged`, see the `keyboard` module), and when
the page is printed. A click between the buttons reaches the content below.

## Groups

`rc-floating-group` holds buttons side by side, on the left of the line, or on the right with `side="right"`.

- **Keys**: the `key` attribute of a button (`Ctrl-ArrowLeft`, see the `keyboard` module) clicks it; the group
  declares the keys of its buttons as floating keys of the keyboard, under its `name`. A hidden or disabled button
  has no key.
- **Size**: the attribute `size` of the bar, of a group or of a button is the size of the icons, in pixels (33 by
  default); a button measures 5/3 of it (55 px), and the space between buttons 2/3 of it (22 px). A button takes the
  size of its own attribute, else of its group, else of the bar: `<rc-floating-bar size="26">` makes every button
  smaller, for a phone.
- **Colours**: the buttons stand on the colour `--rc-floating`, with their icon in `--rc-floating-text`; an
  application sets them on a group, in its CSS. With `gradient="right"`, each button is darker than the one on its
  left; with `gradient="left"`, than the one on its right.

```css
rc-floating-group.arrows { --rc-floating: oklch(70% .15 10); }
rc-floating-group[name="card"] { --rc-floating: light-dark(oklch(78% .1 275), oklch(62% .12 275)); }
```

## Buttons

`rc-floating-button` is a round `rc-icon-button` (55 px, icon of 33 px): `icon`, `size`, `title` (it names the
button), `label`, `disabled`, `key`, `hidden`, and the actions `data-*` (see the `actions` module).

The sizes are CSS properties set by the attribute `size`: `--rc-floating-size` (the button), `--rc-floating-gap`
(the space between buttons) and `--rc-floating-margin` (the space below the bar).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcFloatingButton` | class | The component of `<rc-floating-button>`: a round icon button. |
| `RcFloatingGroup` | class | The component of `<rc-floating-group>`: floating buttons side by side, with their keys and their colours. |
| `RcFloatingBar` | class | The component of `<rc-floating-bar>`: the line of the floating buttons, at the end of the view. |

## Details

### RcFloatingButton

The component of `<rc-floating-button>`: a round icon button.

### RcFloatingGroup

The component of `<rc-floating-group>`: floating buttons side by side, with their keys and their colours.

### RcFloatingBar

The component of `<rc-floating-bar>`: the line of the floating buttons, at the end of the view.
