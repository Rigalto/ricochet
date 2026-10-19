// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Colours of the interface: palettes, shades, day and night.
 *
 * ## Tokens
 *
 * Components never use a colour: they use **tokens**, CSS custom properties named after their role. The tokens are
 * computed from three parameters, set by the palette of the block the component is in:
 *
 * | Parameter | Role |
 * | --- | --- |
 * | `--rc-hue` | hue of the palette, from 0 to 360 (oklch) |
 * | `--rc-chroma` | intensity of the palette: 0 for grey, about 0.08 for a vivid tint |
 * | `--rc-depth` | 0, 1 or 2: the surface is darker at each step |
 *
 * | Token | Use |
 * | --- | --- |
 * | `--rc-surface` | background of the block |
 * | `--rc-surface-raised` | background of what stands on the block: an input, a card, a menu |
 * | `--rc-text` | text |
 * | `--rc-text-strong` | titles |
 * | `--rc-text-muted` | labels, help texts |
 * | `--rc-text-faint` | dimmed texts, placeholders |
 * | `--rc-border` | borders, separators |
 * | `--rc-link` | links |
 * | `--rc-accent` | hover |
 * | `--rc-accent-active` | pressed |
 * | `--rc-selected` | selection |
 * | `--rc-focus` | focus ring |
 * | `--rc-disabled` / `--rc-disabled-surface` | disabled text and background |
 * | `--rc-danger`, `--rc-warning`, `--rc-success`, `--rc-info` | states: text, border, icon |
 * | `--rc-danger-surface`, `--rc-warning-surface`, `--rc-success-surface`, `--rc-info-surface` | states: background, mixed with the surface of the block |
 * | `--rc-shadow` | text shadow (`--rc-shadow-color`: its colour) |
 * | `--rc-elevation-1`, `-2`, `-3` | box shadows, from close to the surface to high above it |
 *
 * Errors, warnings, successes and information are **states** of a component (`state="error"`…), not palettes: their
 * colours are mixed with the surface of the block, so they fit any palette, by day and by night.
 *
 * ## Palettes
 *
 * A palette is named after the part of the interface it is meant for, not after its colours. It is set on a block
 * with the `palette` attribute, and applies to everything inside, at any depth; a palette inside another one wins for
 * its subtree. The page has the default palette.
 *
 * | Palette | For |
 * | --- | --- |
 * | (none) | the page |
 * | `header` | the header bar |
 * | `view` | the main view |
 * | `module` | the side modules |
 *
 * The `shade` attribute makes the surface darker: `light` (default), `medium`, `deep`. An application adds its own
 * palettes, outside any cascade layer, by setting the parameters only:
 *
 * ```css
 * [palette="game"] { --rc-hue: 140; --rc-chroma: .07; }
 * ```
 *
 * A palette may also set any token directly, or define its own tokens (a gradient, for instance).
 *
 * ## Shadows
 *
 * | Class | Effect |
 * | --- | --- |
 * | `rc-shadow-1`, `rc-shadow-2`, `rc-shadow-3` | box shadow (`--rc-elevation-1`…) |
 * | `rc-shadow-none` | no box shadow |
 * | `rc-text-shadow` | text shadow (`--rc-shadow`) |
 *
 * ## Day and night
 *
 * Every token has a day value and a night value (`light-dark()`). The configuration item `ricochet-theme` chooses:
 * `system` (default, follows the setting of the computer), `day` or `night`. `setTheme()` changes it; the
 * `themeChanged` event tells which scheme is shown, for the views that draw colours themselves (a canvas). A block may
 * force a scheme for its subtree with the `scheme` attribute: `day` or `night`.
 *
 * Importing the module adds the CSS of the tokens to the page, in the `ricochet` cascade layer: any rule of the
 * application wins over it.
 *
 * @module theme
 * @category ui
 * @fires {{theme: string, scheme: string}} themeChanged - The theme or the scheme of the system changed: `theme` is
 *   `system`, `day` or `night`; `scheme` is the one shown, `day` or `night`.
 */

import {WController} from '../core/w-controller.mjs'
import {css} from '../core/css.mjs'
import {itemStore} from '../core/items.mjs'
import '../core/config.mjs'

/** Name of the configuration item that holds the theme: `system`, `day` or `night`. */
export const THEME_ITEM = 'ricochet-theme'

const THEMES = new Set(['system', 'day', 'night'])
const COLOR_SCHEME = {system: 'light dark', day: 'light', night: 'dark'}

// the formulas are declared on every element that sets a parameter: a custom property computed from another one is
// resolved where it is declared, and inherited as a value
const TOKENS = `
:root, [palette], [shade], [scheme] {
  --rc-surface: light-dark(
    oklch(calc(98% - var(--rc-depth) * 4%) calc(var(--rc-chroma) * .5) var(--rc-hue)),
    oklch(calc(24% - var(--rc-depth) * 4%) calc(var(--rc-chroma) * .6) var(--rc-hue)));
  --rc-surface-raised: light-dark(
    oklch(calc(100% - var(--rc-depth) * 2%) calc(var(--rc-chroma) * .3) var(--rc-hue)),
    oklch(calc(30% - var(--rc-depth) * 3%) calc(var(--rc-chroma) * .6) var(--rc-hue)));
  --rc-text: light-dark(oklch(27% calc(var(--rc-chroma) * 1.2) var(--rc-hue)), oklch(91% calc(var(--rc-chroma) * .5) var(--rc-hue)));
  --rc-text-strong: light-dark(oklch(20% calc(var(--rc-chroma) * 1.4) var(--rc-hue)), oklch(97% calc(var(--rc-chroma) * .4) var(--rc-hue)));
  --rc-text-muted: color-mix(in oklch, var(--rc-text) 70%, var(--rc-surface));
  --rc-text-faint: color-mix(in oklch, var(--rc-text) 45%, var(--rc-surface));
  --rc-border: color-mix(in oklch, var(--rc-text) 30%, var(--rc-surface));
  --rc-link: light-dark(oklch(45% .15 var(--rc-hue)), oklch(80% .11 var(--rc-hue)));
  --rc-accent: light-dark(oklch(75% .15 70), oklch(80% .13 75));
  --rc-accent-active: light-dark(oklch(85% .12 80), oklch(70% .14 65));
  --rc-selected: light-dark(oklch(75% .15 145), oklch(65% .13 145));
  --rc-focus: light-dark(oklch(60% .18 255), oklch(75% .14 255));
  --rc-disabled: color-mix(in oklch, var(--rc-text) 35%, var(--rc-surface));
  --rc-disabled-surface: color-mix(in oklch, var(--rc-text) 8%, var(--rc-surface));
  --rc-danger: light-dark(oklch(52% .2 27), oklch(72% .17 27));
  --rc-warning: light-dark(oklch(58% .15 65), oklch(80% .14 75));
  --rc-success: light-dark(oklch(50% .14 150), oklch(76% .14 150));
  --rc-info: light-dark(oklch(52% .14 240), oklch(76% .11 240));
  --rc-danger-surface: color-mix(in oklch, var(--rc-danger) 14%, var(--rc-surface));
  --rc-warning-surface: color-mix(in oklch, var(--rc-warning) 16%, var(--rc-surface));
  --rc-success-surface: color-mix(in oklch, var(--rc-success) 14%, var(--rc-surface));
  --rc-info-surface: color-mix(in oklch, var(--rc-info) 14%, var(--rc-surface));
  --rc-shadow-color: light-dark(oklch(0% 0 0 / 25%), oklch(0% 0 0 / 70%)); /* light-dark() takes colours only */
  --rc-shadow: 1px 1px 2px var(--rc-shadow-color);
  --rc-elevation-1: 0 1px 2px var(--rc-shadow-color);
  --rc-elevation-2: 0 2px 4px var(--rc-shadow-color), 0 1px 2px var(--rc-shadow-color);
  --rc-elevation-3: 0 6px 12px var(--rc-shadow-color), 0 2px 4px var(--rc-shadow-color);
}
.rc-shadow-1 { box-shadow: var(--rc-elevation-1); }
.rc-shadow-2 { box-shadow: var(--rc-elevation-2); }
.rc-shadow-3 { box-shadow: var(--rc-elevation-3); }
.rc-shadow-none { box-shadow: none; }
.rc-text-shadow { text-shadow: var(--rc-shadow); }
:root {
  --rc-hue: 250;
  --rc-chroma: .015;
  --rc-depth: 0;
  color-scheme: light dark;
  background-color: var(--rc-surface);
  color: var(--rc-text);
}
[palette], [shade], [scheme] {
  background-color: var(--rc-surface);
  color: var(--rc-text);
}
[palette="header"] { --rc-hue: 230; --rc-chroma: .03; }
[palette="view"] { --rc-hue: 225; --rc-chroma: .05; }
[palette="module"] { --rc-hue: 75; --rc-chroma: .035; }
[shade="light"] { --rc-depth: 0; }
[shade="medium"] { --rc-depth: 1; }
[shade="deep"] { --rc-depth: 2; }
[scheme="day"] { color-scheme: light; }
[scheme="night"] { color-scheme: dark; }
`

css(TOKENS, {name: 'ricochet theme', layer: 'ricochet'})

const systemScheme = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day'

/**
 * The theme: applies the configuration item `ricochet-theme` to the page. One instance, created when the module is
 * imported.
 */
class ThemeController extends WController {
  constructor () {
    super()
    /** The theme: `system`, `day` or `night`. */
    this.theme = 'system'
    this.observeItems([THEME_ITEM])
    if (typeof matchMedia === 'function') {
      // a change of the setting of the computer matters when the theme follows it
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme === 'system') { this.#emit() }
      })
    }
  }

  itemsChanged (items) {
    const value = items[THEME_ITEM]
    const theme = THEMES.has(value) ? value : 'system'
    if (value !== undefined && !THEMES.has(value)) { console.warn(`theme: unknown value '${value}' of ${THEME_ITEM}, 'system' used`) }
    const changed = theme !== this.theme
    this.theme = theme
    if (typeof document !== 'undefined') { document.documentElement.style.colorScheme = COLOR_SCHEME[theme] }
    if (changed) { this.#emit() }
  }

  /** The scheme shown: `day` or `night`. */
  get scheme () { return this.theme === 'system' ? systemScheme() : this.theme }

  #emit () { this.emit('themeChanged', {theme: this.theme, scheme: this.scheme}) }
}

/** The theme of the page. */
export const theme = new ThemeController()

/**
 * Changes the theme, saved in the configuration item `ricochet-theme`.
 * @param {string} value - `system`, `day` or `night`.
 */
export const setTheme = value => {
  console.assert(THEMES.has(value), `setTheme: 'system', 'day' or 'night' expected, not '${value}'`)
  itemStore().setItem(THEME_ITEM, value)
}
