# iconset

Module `iconset` · group `icons` · source [`src/icons/iconset.mjs`](../../src/icons/iconset.mjs)

Icon set drawn by hand on a common 24 × 24 grid. Each icon is the `d` attribute of a single SVG `<path>`:

```html
<svg viewBox="0 0 24 24"><path d="…"></path></svg>
```

## Drawing rules

- The icon name is made of lowercase letters only.
- The drawing fits in a 24 × 24 square.
- Strokes are 2 units wide, except in very specific cases.
- Numbers are rounded to two decimals.
- An icon is made of one or more shapes, each starting with `Mx y` and ending with `z`.
- Inside a shape, only the `h`, `v`, `l` and `a` commands are used, so that all icons look alike.
- Line ends and corners are always rounded (`a1 1 0 0 1 x y`).
- Slopes have an integer ratio between the X axis and the Y axis.

> **Note:** some icons were downloaded from the web and do not follow these rules yet. They are being redrawn one by
> one, which also halves the size of their path on average. Icons not yet redrawn are shown in orange in the
> *Icons* view.

## Categories

Each icon belongs to one or more categories, by meaning or by shape. Categories are used to filter the
icons in the *Icons* view.

## Checks

When the module loads, it checks that:

- every icon belongs to at least one category, and every icon of a category exists;
- every icon is compressed (two decimals at most, no double space);
- every redrawn icon only uses the allowed commands.

Errors are reported in the console, along with the number of icons still to redraw.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `iconset` | const | Icon paths, by icon name: the value is the `d` attribute of an SVG `<path>`. |
| `iconcategory` | const | Icon names, by category. Categories come from Font Awesome, plus a few of my own. |
| `iconsetList` | const | Names of all the icons. |
| `iconsetCount` | const | Number of icons. |
| `iconPrivate` | const | Names of the icons drawn by hand, following the drawing rules. The other icons, downloaded from the web, are shown in a different colour in the *Icons* view. |
