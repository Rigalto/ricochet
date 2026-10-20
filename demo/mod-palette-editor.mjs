// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The palette editor: a module of the application to design a new palette (see the guide of the themes,
 * `docs/THEME.md`), and see it at once in every situation.
 *
 * This file is a copy of the module of SweetHome, the application Ricochet comes from: the content is the same, only
 * the frame around it is simpler in the demo (`demo/modules.html`). It shows a module written with Ricochet only:
 * components `rc-*`, configuration items, no code for the clicks.
 *
 * ```html
 * <mod-palette-editor></mod-palette-editor>
 * ```
 *
 * ## Three zones
 *
 * 1. **The palette**: its hue (0 to 360), its intensity (0 for grey, 0.15 for vivid colours), and the shade shown
 *    (light, medium, deep).
 * 2. **The situations**: day or night, the states (information, warning, error, success), the disabled controls, the
 *    shadows.
 * 3. **The preview**: a block in the palette, with the elements of the interface; only their colours matter. Below it,
 *    the CSS rule of the palette, to copy into the CSS of the application.
 *
 * The preview uses no generated CSS: its block has an attribute `palette` that no rule matches, and the hue and the
 * intensity as inline style; the tokens are computed on it, as for any palette.
 *
 * The settings are configuration items: an application that keeps its items keeps them from one session to the next.
 *
 * @module mod-palette-editor
 */

import {WComponent, css, itemStore} from 'ricochet/ricochet.mjs'

const ITEMS = {
  hue: 'modpaletteeditor-hue',
  chroma: 'modpaletteeditor-chroma',
  shade: 'modpaletteeditor-shade',
  scheme: 'modpaletteeditor-scheme',
  states: 'modpaletteeditor-states',
  disabled: 'modpaletteeditor-disabled',
  shadows: 'modpaletteeditor-shadows',
  name: 'modpaletteeditor-name'
}
const DEFAULTS = {hue: '140', chroma: '0.07', shade: 'light', scheme: 'day', states: 'no', disabled: 'no', shadows: 'no',
  name: 'game'}

css(`
mod-palette-editor { display: grid; gap: .75rem; }
mod-palette-editor .zone { display: grid; gap: .4rem; }
mod-palette-editor .zone + .zone { border-top: 1px solid var(--rc-border); padding-top: .75rem; }
mod-palette-editor .row { display: grid; grid-template-columns: 4.5rem 1fr; align-items: center; gap: .5rem; }
mod-palette-editor .row > span:first-child { color: var(--rc-text-muted); font-size: .85rem; }
mod-palette-editor .checks { display: flex; flex-wrap: wrap; gap: .25rem .75rem; }
mod-palette-editor .preview { display: grid; gap: .5rem; border: 1px solid var(--rc-border); }
mod-palette-editor .preview h3 { margin: 0; font-size: 1rem; color: var(--rc-text-strong); }
mod-palette-editor .preview p { margin: 0; }
mod-palette-editor .preview .muted { color: var(--rc-text-muted); font-size: .85rem; }
mod-palette-editor .preview .faint { color: var(--rc-text-faint); font-size: .85rem; }
mod-palette-editor .preview a { color: var(--rc-link); text-decoration: underline; }
mod-palette-editor .preview .line { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; }
mod-palette-editor .preview .inner { padding: .5rem; }
mod-palette-editor .state { padding: .25rem .5rem; border-left: 3px solid; border-radius: 4px; font-size: .85rem; }
mod-palette-editor .state.info { color: var(--rc-info); background: var(--rc-info-surface); }
mod-palette-editor .state.warning { color: var(--rc-warning); background: var(--rc-warning-surface); }
mod-palette-editor .state.danger { color: var(--rc-danger); background: var(--rc-danger-surface); }
mod-palette-editor .state.success { color: var(--rc-success); background: var(--rc-success-surface); }
mod-palette-editor .rule { display: flex; align-items: center; gap: .4rem; }
mod-palette-editor .rule code { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: .8rem; padding: .3rem .4rem;
  border-radius: 4px; background: var(--rc-surface-raised); border: 1px solid var(--rc-border); }
`)

/**
 * The component of `<mod-palette-editor>`.
 * @item {in/out} modpaletteeditor-hue - Hue of the palette, from 0 to 360.
 * @item {in/out} modpaletteeditor-chroma - Intensity of the palette, from 0 to 0.15.
 * @item {in/out} modpaletteeditor-shade - Shade shown: `light`, `medium` or `deep`.
 * @item {in/out} modpaletteeditor-scheme - `day` or `night`.
 * @item {in/out} modpaletteeditor-states - `yes`: the blocks of the states are shown.
 * @item {in/out} modpaletteeditor-disabled - `yes`: the controls of the preview are disabled.
 * @item {in/out} modpaletteeditor-shadows - `yes`: the preview has shadows.
 * @item {in/out} modpaletteeditor-name - Name of the palette, in the CSS rule.
 */
export class ModPaletteEditor extends WComponent {
  attach () {
    this.innerHTML(`
      <div class="zone">
        <div class="row"><span>Hue</span><rc-slider data-item="${ITEMS.hue}" min="0" max="360" step="1" label="Hue"></rc-slider></div>
        <div class="row"><span>Intensity</span><rc-slider data-item="${ITEMS.chroma}" min="0" max="0.15" step="0.005" label="Intensity"></rc-slider></div>
        <div class="row"><span>Shade</span>
          <rc-radio-group data-item="${ITEMS.shade}">
            <rc-radio value="light">Light</rc-radio><rc-radio value="medium">Medium</rc-radio><rc-radio value="deep">Deep</rc-radio>
          </rc-radio-group>
        </div>
      </div>
      <div class="zone">
        <div class="row"><span>Scheme</span>
          <rc-radio-group data-item="${ITEMS.scheme}">
            <rc-radio value="day">Day</rc-radio><rc-radio value="night">Night</rc-radio>
          </rc-radio-group>
        </div>
        <div class="checks">
          <rc-checkbox data-item="${ITEMS.states}">States</rc-checkbox>
          <rc-checkbox data-item="${ITEMS.disabled}">Disabled</rc-checkbox>
          <rc-checkbox data-item="${ITEMS.shadows}">Shadows</rc-checkbox>
        </div>
      </div>
      <div class="zone">
        <div class="preview rc-panel" palette="mod-palette-editor-preview" name="preview">
          <h3 name="title">Title of a block</h3>
          <p>Text of the block, <a>a link</a>.</p>
          <p class="muted">Label or help text</p>
          <p class="faint">Dimmed text</p>
          <div class="line">
            <rc-text-button name="control">Button</rc-text-button>
            <rc-icon-button icon="save" name="control">Save</rc-icon-button>
            <rc-icon-button icon="trash" title="Delete" name="control"></rc-icon-button>
            <rc-text-button link name="control">Link</rc-text-button>
          </div>
          <div class="line">
            <rc-checkbox checked name="control">Checked</rc-checkbox>
            <rc-checkbox name="control">Box</rc-checkbox>
          </div>
          <rc-radio-group value="a" name="control"><rc-radio value="a">One</rc-radio><rc-radio value="b">Two</rc-radio></rc-radio-group>
          <rc-input value="Field" label="Field" name="control"></rc-input>
          <rc-select options="Option|Other" label="List" name="control"></rc-select>
          <rc-slider value="40" label="Slider" name="control"></rc-slider>
          <rc-tabs value="a" name="control">
            <rc-tab value="a" label="Tab"></rc-tab><rc-tab value="b" label="Other"></rc-tab>
          </rc-tabs>
          <div class="rc-panel inner" shade="deep" name="inner">A block inside, one shade deeper</div>
          <div class="state info" name="state">Information</div>
          <div class="state warning" name="state">Warning</div>
          <div class="state danger" name="state">Error</div>
          <div class="state success" name="state">Success</div>
        </div>
      </div>
      <div class="zone">
        <div class="row"><span>Name</span><rc-input data-item="${ITEMS.name}" required pattern="[a-z][a-z0-9-]*" label="Name of the palette"></rc-input></div>
        <div class="rule">
          <code name="rule"></code>
          <rc-icon-button icon="copy" title="Copy the CSS rule" name="copy"></rc-icon-button>
        </div>
      </div>`)
    // the items not set yet get their default values: the controls show them
    const missing = Object.keys(ITEMS).filter(key => itemStore().get(ITEMS[key]) === undefined)
    if (missing.length > 0) { this.setItems(missing.map(key => ({item: ITEMS[key], value: DEFAULTS[key]}))) }
    this.elPreview = this.element.querySelector('[name="preview"]')
    this.elRule = this.element.querySelector('[name="rule"]')
    this.elCopy = this.element.querySelector('[name="copy"]')
    this.observeItems(Object.values(ITEMS))
  }

  itemsChanged (items) {
    const value = key => items[ITEMS[key]] ?? DEFAULTS[key]
    const hue = Number(value('hue'))
    const chroma = Number(value('chroma'))
    const preview = this.elPreview
    preview.style.setProperty('--rc-hue', `${hue}`)
    preview.style.setProperty('--rc-chroma', `${chroma}`)
    preview.setAttribute('shade', value('shade'))
    preview.setAttribute('scheme', value('scheme') === 'night' ? 'night' : 'day')
    const yes = key => value(key) === 'yes'
    for (const state of preview.querySelectorAll('[name="state"]')) { state.hidden = !yes('states') }
    for (const control of preview.querySelectorAll('[name="control"]')) { control.toggleAttribute('disabled', yes('disabled')) }
    preview.classList.toggle('rc-shadow-2', yes('shadows'))
    preview.querySelector('[name="inner"]').classList.toggle('rc-shadow-inset', yes('shadows'))
    preview.querySelector('[name="title"]').classList.toggle('rc-text-shadow', yes('shadows'))
    const name = value('name') === '' ? DEFAULTS.name : value('name')
    const rule = `[palette="${name}"] { --rc-hue: ${hue}; --rc-chroma: ${chroma}; }`
    this.elRule.textContent = rule
    this.elCopy.dataset.paste = rule
  }
}

WComponent.define('mod-palette-editor', ModPaletteEditor)
