// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The look shared by the components that hold a `<button>`: `rc-icon-button`, `rc-text-button`, and `rc-checkbox` and
 * `rc-radio`, which look like flat buttons. Imported by these components; an application does not import it.
 *
 * | Attribute | Look |
 * | --- | --- |
 * | (none) | the button stands on the surface of its block (`--rc-surface-raised`), with a light border |
 * | `flat` | no background nor border: a toolbar, a breadcrumb |
 * | `link` | `rc-text-button` only: a link, in `--rc-link`, underlined with dots |
 * | `palette`, `shade` | the button takes the surface of that palette or shade: an action that stands out |
 *
 * Every look has the hover and pressed states of the palette (`--rc-accent`, `--rc-accent-active`), the focus ring
 * `--rc-focus` with the keyboard, and the disabled tokens. The hover applies only where the pointer can hover
 * (`@media (hover: hover)`): on a touch screen, it would stay on the button after a tap. Shadows come from the classes
 * of the `theme` module (`rc-shadow-2`, `rc-text-shadow`…).
 *
 * @module button-style
 * @category ui
 */

import {css} from '../core/css.mjs'

const ALL = ':is(rc-icon-button, rc-text-button, rc-checkbox, rc-radio)'
const FLAT = ':is(rc-icon-button[flat], rc-text-button[flat], rc-checkbox, rc-radio)'
const COLOURED = ':is(rc-icon-button, rc-text-button):is([palette], [shade])'

css(`
${ALL} { vertical-align: middle; }
${ALL} > button {
  display: inline-flex;
  align-items: center;
  gap: .35em;
  margin: 0;
  padding: .3em .55em;
  border: 1px solid color-mix(in oklch, var(--rc-border) 55%, transparent);
  border-radius: 6px;
  background: var(--rc-surface-raised);
  color: inherit;
  font: inherit;
  line-height: 1.2;
  text-align: start;
  cursor: pointer;
  transition: background-color .12s, border-color .12s;
}
@media (hover: hover) { ${ALL} > button:hover { background: color-mix(in oklch, var(--rc-accent) 30%, var(--rc-surface-raised)); } }
${ALL} > button:active { background: color-mix(in oklch, var(--rc-accent-active) 55%, var(--rc-surface-raised)); }
${ALL} > button:focus-visible { outline: 2px solid var(--rc-focus); outline-offset: 1px; }
${ALL} > button:disabled {
  color: var(--rc-disabled);
  background: var(--rc-disabled-surface);
  border-color: transparent;
  cursor: not-allowed;
}
${ALL} > button > span:empty { display: none; }
${FLAT} > button { background: transparent; border-color: transparent; padding: .2em .3em; }
@media (hover: hover) { ${FLAT} > button:hover { background: color-mix(in oklch, var(--rc-accent) 25%, transparent); } }
${FLAT} > button:active { background: color-mix(in oklch, var(--rc-accent-active) 45%, transparent); }
${FLAT} > button:disabled { background: transparent; }
rc-text-button[link] > button {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--rc-link);
  text-decoration: underline dotted;
  text-underline-offset: .2em;
}
@media (hover: hover) { rc-text-button[link] > button:hover { background: transparent; text-decoration-style: solid; } }
rc-text-button[link] > button:active { background: transparent; color: var(--rc-accent-active); }
rc-text-button[link] > button:disabled { background: transparent; color: var(--rc-disabled); }
${COLOURED} { background: transparent; border-radius: 6px; }
${COLOURED} > button { background: var(--rc-surface); border-color: transparent; }
@media (hover: hover) { ${COLOURED} > button:hover { background: color-mix(in oklch, var(--rc-accent) 30%, var(--rc-surface)); } }
${COLOURED} > button:active { background: color-mix(in oklch, var(--rc-accent-active) 55%, var(--rc-surface)); }
`, {name: 'ricochet buttons', layer: 'ricochet'})
