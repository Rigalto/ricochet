// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The look shared by the fields: `rc-input`, `rc-textarea` and `rc-select`. Imported by these components; an
 * application does not import it.
 *
 * The field stands on the surface of its block (`--rc-surface-raised`), with the border `--rc-border`; the hover
 * mixes `--rc-accent` into the border; the focus shows `--rc-focus`; an invalid field (attribute `invalid`) shows
 * `--rc-danger`; the placeholder is in `--rc-text-faint`; a disabled field uses the disabled tokens. The field takes
 * the width of its element, set by the application.
 *
 * @module field-style
 * @category ui
 */

import {css} from '../core/css.mjs'

const HOSTS = 'rc-input, rc-textarea, rc-select'
const FIELD = ':is(rc-input > input, rc-textarea > textarea, rc-select > select)'
const INVALID = ':is(rc-input[invalid] > input, rc-textarea[invalid] > textarea, rc-select[invalid] > select)'

css(`
${HOSTS} { vertical-align: middle; }
${FIELD} {
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: .3em .5em;
  border: 1px solid var(--rc-border);
  border-radius: 6px;
  background: var(--rc-surface-raised);
  color: var(--rc-text);
  font: inherit;
  line-height: 1.2;
  transition: border-color .12s, box-shadow .12s;
}
${FIELD}::placeholder { color: var(--rc-text-faint); opacity: 1; }
${FIELD}:hover { border-color: color-mix(in oklch, var(--rc-accent) 60%, var(--rc-border)); }
${FIELD}:focus { outline: none; border-color: var(--rc-focus); box-shadow: 0 0 0 1px var(--rc-focus); }
${INVALID}, ${INVALID}:hover { border-color: var(--rc-danger); }
${INVALID}:focus { border-color: var(--rc-danger); box-shadow: 0 0 0 1px var(--rc-danger); }
${FIELD}:disabled {
  color: var(--rc-disabled);
  background: var(--rc-disabled-surface);
  border-color: transparent;
  box-shadow: none;
  cursor: not-allowed;
}
`, {name: 'ricochet fields', layer: 'ricochet'})
