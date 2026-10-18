# theme

Module `theme` · group `ui` · source [`src/ui/theme.mjs`](../../src/ui/theme.mjs)

Colours of the interface: palettes, shades, day and night.

## Tokens

Components never use a colour: they use **tokens**, CSS custom properties named after their role. The tokens are
computed from three parameters, set by the palette of the block the component is in:

| Parameter | Role |
| --- | --- |
| `--rc-hue` | hue of the palette, from 0 to 360 (oklch) |
| `--rc-chroma` | intensity of the palette: 0 for grey, about 0.08 for a vivid tint |
| `--rc-depth` | 0, 1 or 2: the surface is darker at each step |

| Token | Use |
| --- | --- |
| `--rc-surface` | background of the block |
| `--rc-surface-raised` | background of what stands on the block: an input, a card, a menu |
| `--rc-text` | text |
| `--rc-text-strong` | titles |
| `--rc-text-muted` | labels, help texts |
| `--rc-text-faint` | dimmed texts, placeholders |
| `--rc-border` | borders, separators |
| `--rc-link` | links |
| `--rc-accent` | hover |
| `--rc-accent-active` | pressed |
| `--rc-selected` | selection |
| `--rc-focus` | focus ring |
| `--rc-disabled` / `--rc-disabled-surface` | disabled text and background |
| `--rc-danger`, `--rc-warning`, `--rc-success`, `--rc-info` | states: text, border, icon |
| `--rc-danger-surface`, `--rc-warning-surface`, `--rc-success-surface`, `--rc-info-surface` | states: background, mixed with the surface of the block |
| `--rc-shadow` | text shadow (`--rc-shadow-color`: its colour) |

Errors, warnings, successes and information are **states** of a component (`state="error"`…), not palettes: their
colours are mixed with the surface of the block, so they fit any palette, by day and by night.

## Palettes

A palette is named after the part of the interface it is meant for, not after its colours. It is set on a block
with the `palette` attribute, and applies to everything inside, at any depth; a palette inside another one wins for
its subtree. The page has the default palette.

| Palette | For |
| --- | --- |
| (none) | the page |
| `header` | the header bar |
| `view` | the main view |
| `module` | the side modules |

The `shade` attribute makes the surface darker: `light` (default), `medium`, `deep`. An application adds its own
palettes, outside any cascade layer, by setting the parameters only:

```css
[palette="game"] { --rc-hue: 140; --rc-chroma: .07; }
```

A palette may also set any token directly, or define its own tokens (a gradient, for instance).

## Day and night

Every token has a day value and a night value (`light-dark()`). The configuration item `ricochet-theme` chooses:
`system` (default, follows the setting of the computer), `day` or `night`. `setTheme()` changes it; the
`themeChanged` event tells which scheme is shown, for the views that draw colours themselves (a canvas). A block may
force a scheme for its subtree with the `scheme` attribute: `day` or `night`.

Importing the module adds the CSS of the tokens to the page, in the `ricochet` cascade layer: any rule of the
application wins over it.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| event | `themeChanged` | out | `{theme: string, scheme: string}` | The theme or the scheme of the system changed: `theme` is `system`, `day` or `night`; `scheme` is the one shown, `day` or `night`. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `THEME_ITEM` | const | Name of the configuration item that holds the theme: `system`, `day` or `night`. |
| `theme` | const | The theme of the page. |
| `setTheme` | function | Changes the theme, saved in the configuration item `ricochet-theme`. |

## Details

### setTheme()

Changes the theme, saved in the configuration item `ricochet-theme`.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | string | `system`, `day` or `night`. |
