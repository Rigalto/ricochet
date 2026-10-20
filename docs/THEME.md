# Themes and palettes

This guide explains how the colours of an interface built with Ricochet are chosen, and how an application gives
its interface a look of its own: palettes, shades, day and night, shadows. The reference of every token, attribute and
class is the page of the `theme` module, [api/theme.module.md](api/theme.module.md); see them at work in
[demo/theme.html](../demo/theme.html) and [demo/components.html](../demo/components.html).

## 1. Tokens, parameters, palettes

The components never write a colour. They use **tokens**: CSS custom properties named after their role, such as
`--rc-surface` (the background of a block), `--rc-text` or `--rc-focus`.

```css
rc-dialog > dialog { background: var(--rc-surface-raised); color: var(--rc-text); }
```

The tokens are computed, in `oklch()`, from three **parameters**:

| Parameter | Role |
| --- | --- |
| `--rc-hue` | hue, from 0 to 360 |
| `--rc-chroma` | intensity: 0 for grey, about 0.08 for a vivid tint |
| `--rc-depth` | 0, 1 or 2: the surface is darker at each step |

The parameters are set by the **attributes** of the blocks of the page. Every block inside takes them, at any depth,
until another block sets other ones:

| Attribute | Values | Effect |
| --- | --- | --- |
| `palette` | `header`, `view`, `module`, or a palette of the application | hue and intensity |
| `shade` | `light` (default), `medium`, `deep` | depth |
| `scheme` | `day`, `night` | forces day or night for the block |

```html
<header palette="header">…</header>
<main palette="view">
  <section shade="deep">…</section>          <!-- the palette of the view, darker -->
  <aside palette="module" scheme="night">…</aside>
</main>
```

A block with one of these attributes paints its own background (`--rc-surface`) and text (`--rc-text`).

> **Only these attributes recompute the tokens.** A token is computed where its formula is declared, and the formulas
> are declared on the elements that have `palette`, `shade` or `scheme` (and on `:root`). Setting `--rc-hue` on a
> plain `<div>` changes nothing: the tokens inside it were already computed above it. Give the block a `palette`
> instead.

## 2. Palettes of the application

A palette is named after the part of the interface it is meant for, not after its colours. An application adds its
own palettes in its CSS, **outside any cascade layer**: the CSS of Ricochet is in the `ricochet` layer, so any rule of
the application wins over it.

**By its parameters** — the usual way: every token follows, by day and by night.

```css
[palette="game"] { --rc-hue: 140; --rc-chroma: .07; }
```

The palette editor of [demo/modules.html](../demo/modules.html) finds the two numbers: move the hue and the
intensity, look at the interface by day and by night, in each shade, with its states, then copy the rule.

**By setting tokens directly** — for a surface that must stand out (an action button, a coloured band). The other
tokens are still computed from the parameters; give each token a day and a night value with `light-dark()`.

```css
[palette="action"] {
  --rc-surface: light-dark(oklch(48% .12 235), oklch(42% .1 235));
  --rc-text: oklch(98% .01 235);
}
```

**By tokens of its own** — a palette may define tokens that only the application uses (a gradient, the colour of a
kind of record), next to those of Ricochet.

The palettes of Ricochet (`header`, `view`, `module`) can be changed the same way, by the application: its rule wins.

## 3. Day and night

Every token has a day value and a night value (`light-dark()`); the browser shows one or the other according to the
`color-scheme` of the page.

- The configuration item `ricochet-theme` chooses: `system` (default: the setting of the computer), `day` or `night`.
  A button sets it with no code, `<rc-icon-button data-item="ricochet-theme" data-value="night">`; from JavaScript,
  `setTheme('night')` (`ricochet/ui/theme.mjs`).
- The attribute `scheme="day"` or `scheme="night"` forces a block, whatever the theme.
- The event `themeChanged {theme, scheme}` tells the views that draw colours themselves (a canvas) that the scheme
  shown changed.

A canvas cannot use a token, and the value of a token read with `getPropertyValue()` is its formula, not a colour.
Read a property that uses the token instead: the browser gives it resolved.

```javascript
class MapView extends WComponent {
  attach () {
    this.listen('themeChanged') // draws again when the scheme shown changes
    this.draw()
  }

  themeChangedDispatched () { this.draw() }

  draw () {
    const style = getComputedStyle(this.element) // the element has background: var(--rc-surface)
    this.context.fillStyle = style.backgroundColor // "oklch(0.97 0.01 225)": a colour the canvas understands
    …
  }
}
```

## 4. The tokens

| Token | Use | Read by |
| --- | --- | --- |
| `--rc-surface` | background of the block | blocks with a palette, coloured buttons, slider |
| `--rc-surface-raised` | what stands on the block: a button, a field, a menu, a dialog | buttons, fields, dropdown, dialog, slider |
| `--rc-text`, `--rc-text-strong` | text, titles | every component |
| `--rc-text-muted`, `--rc-text-faint` | labels and help texts, dimmed texts and placeholders | fields, tabs, slider |
| `--rc-border` | borders, separators | buttons, fields, tabs, dropdown, dialog, slider |
| `--rc-link` | links | `rc-text-button link` |
| `--rc-accent`, `--rc-accent-active` | hover, pressed | buttons, fields, tabs, slider |
| `--rc-selected` | what is chosen: a checked box, the tab shown, the filled part of a slider | checkbox, radio, tabs, slider |
| `--rc-focus` | focus ring of the keyboard | every control |
| `--rc-disabled`, `--rc-disabled-surface` | disabled text and background | every control |
| `--rc-danger`, `--rc-warning`, `--rc-success`, `--rc-info` | states: text, border, icon | invalid fields (`--rc-danger`); the application |
| `--rc-danger-surface`… | states: background, mixed with the surface of the block | the application |
| `--rc-shadow`, `--rc-shadow-color` | text shadow, colour of every shadow | `rc-text-shadow` |
| `--rc-elevation-1`, `-2`, `-3`, `--rc-elevation-inset` | box shadows | shadow classes, dropdown, dialog, floating buttons |
| `--rc-floating`, `--rc-floating-text` | colour and icon of the floating buttons | floating buttons |

**States are not palettes.** An error, a warning, a success or an information is shown by a component or a block in
its own palette, with the state tokens: their `-surface` versions are mixed with the surface of the block, so that
they fit any palette, by day and by night.

```css
.message.error { background: var(--rc-danger-surface); color: var(--rc-danger); border-left: 3px solid var(--rc-danger); }
```

## 5. Shadows and panels

| Class | Effect |
| --- | --- |
| `rc-shadow-1`, `rc-shadow-2`, `rc-shadow-3` | box shadow, from close to the surface to high above it |
| `rc-shadow-inset` | shadow inside the block: sunk |
| `rc-shadow-none` | no box shadow |
| `rc-text-shadow` | text shadow |
| `rc-panel` | a block with rounded corners and a padding |

A panel is a class, not a component: it goes on any element, with a palette and a shadow.

```html
<section class="rc-panel rc-shadow-2 rc-text-shadow" palette="module" shade="medium">…</section>
<div class="rc-panel rc-shadow-inset" shade="deep">…</div>
```

## 6. The look of a component

Each component describes its look and the tokens it reads in its page of the [API reference](api/README.md). The
buttons share one look (`button-style`), and so do the fields (`field-style`). To change the look of a component, an
application has three ways, from the lightest:

1. **A palette** on the component or around it: `<rc-text-button palette="action">`.
2. **A token** set on the component, in a rule of the application:
   `rc-slider.volume { --rc-selected: oklch(70% .15 145); }`.
3. **A rule** on the element the component holds (its structure is given in its page): the rules of the application
   win over those of Ricochet, in the `ricochet` layer.

```css
rc-text-button.wide > button { width: 100%; justify-content: center; }
rc-floating-group.arrows { --rc-floating: light-dark(oklch(72% .14 10), oklch(60% .14 10)); }
```

## 7. Writing a component

- Use only tokens: no colour in the CSS of a component, so that it follows every palette, by day and by night.
- Write its CSS with `css()`, next to the component. A component of Ricochet puts it in the `ricochet` layer
  (`css(rules, {layer: 'ricochet'})`); a component of an application does not, so that the application keeps the last
  word.
- List the tokens it reads in its documentation.
- Look at it in every palette and shade, by day and by night: `demo/components.html` shows each component in the
  `header`, `view` and `module` palettes, light and deep, day and night.
