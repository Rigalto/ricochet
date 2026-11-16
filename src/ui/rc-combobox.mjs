// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A field of free text with suggestions: the user chooses a value of the list, or types a new one. It is an
 * `rc-input` whose suggestions are shown by the browser (a native `<datalist>`): the same value, actions, validation
 * and look (see the `rc-input` module). It suits a value taken from a list that grows with use: the groups of a list
 * of notes, the terms of a category.
 *
 * ```html
 * <rc-combobox options="Kitchen|Garden|Garage" data-event="noteGroup" data-param='{"id": "ab"}'></rc-combobox>
 * <rc-combobox source="groups hom-not" required placeholder="Group"></rc-combobox>
 * <rc-combobox data-item="last-author" source="item author-list"></rc-combobox>
 * ```
 *
 * ## Suggestions
 *
 * The suggestions come from the same places as the options of `rc-select` (see the `rc-select` module), the later in
 * the list winning:
 *
 * | From | How |
 * | --- | --- |
 * | the HTML | `<option>` elements written inside `rc-combobox` |
 * | `options` | a text: suggestions separated by `\|`, each `value` or `label#value` |
 * | the `options` property | an array of strings or of `{label, value}`, from JavaScript |
 * | `source` | a named source, declared with `defineOptionSources()` of `rc-select`; `source="name argument"` |
 *
 * A source is asked again after its configuration items and its events, as for `rc-select`; several fields that ask
 * the same source and argument at the same time get one answer.
 *
 * The browser shows the suggestions that match what is typed, as it wishes: some keep the values that start with it,
 * others those that contain it; on a phone, they are shown above the keyboard. A suggestion with a `label` shows it
 * beside the value, where the browser does. The list itself cannot be styled.
 *
 * ## Value
 *
 * As for `rc-input`: the `value` attribute and the `value` property write the value, with no action; the property
 * reads it (`null` when it is invalid). The value is not limited to the suggestions.
 *
 * ## Actions
 *
 * As for `rc-input` (`data-item`, `data-event`, a form), but `commit` is `change` by default: the actions run when the
 * field is left or `Enter` is pressed, not at each keystroke. `commit="enter"` and `commit="input"` remain possible.
 *
 * ## Clean values
 *
 * When the field is left or `Enter` is pressed, before the actions, the typed value is cleaned by `normalize()`: the
 * spaces at both ends are removed, the spaces inside are reduced to one, and a value that differs from a suggestion
 * only by its case takes the spelling of the suggestion (`kitchen` becomes `Kitchen`). A subclass changes this rule
 * by overriding `normalize(value)`. A value written by the application is not cleaned.
 *
 * ## Look
 *
 * The look of the fields (see the `field-style` module). Some browsers add an arrow on the right of a field with
 * suggestions.
 *
 * @module rc-combobox
 * @category ui
 */

import {WComponent} from '../core/w-component.mjs'
import {RcInput} from './rc-input.mjs'
import {findOptionSource, parseOptions, requestOptions} from './rc-select.mjs'
import './field-style.mjs'

let count = 0 // numbers the lists of suggestions: the id of each <datalist>

// a suggestion as {label, value}; the label is '' when it is the value
const normalizeOption = option => {
  const value = typeof option === 'string' ? option : `${option.value ?? option.label}`
  const label = typeof option === 'string' ? '' : `${option.label ?? ''}`
  return {label: label === value ? '' : label, value}
}

/**
 * The component of `<rc-combobox>`: the attributes of `rc-input`, and the ones below.
 * @attr {string} [options] - Suggestions: `value` or `label#value`, separated by `|`.
 * @attr {string} [source] - Named source of suggestions and its argument: `name argument`.
 * @attr {string} [commit=change] - When the actions run: `change`, `enter` or `input`.
 */
export class RcCombobox extends RcInput {
  // the suggestions before the value, as for rc-select
  static observedAttributes = ['type', 'placeholder', 'maxlength', 'readonly', 'disabled', 'label',
    'required', 'min', 'max', 'pattern', 'check', 'options', 'source', 'value']

  /** The suggestions, as `{label, value}`. A new array (or text) replaces them. */
  get options () { return this.list.map(option => ({...option})) }
  set options (options) { this.#show(typeof options === 'string' ? parseOptions(options) : options) }

  attach () {
    // the suggestions written in the HTML, read before rc-input replaces the content
    const written = [...this.element.children].filter(child => child.localName === 'option')
      .map(option => ({label: option.label === option.value ? '' : option.label, value: option.value}))
    super.attach()
    if (!this.element.hasAttribute('commit')) { this.commit = 'change' }
    count += 1
    /** The `<datalist>` of the suggestions. */
    this.elList = document.createElement('datalist')
    this.elList.id = `rc-combobox-${count}`
    this.elField.setAttribute('list', this.elList.id)
    this.element.append(this.elList)
    this.request = 0 // the last request to a source: the answers of the former ones are ignored
    this.source = null
    this.sourceEvents = []
    this.#show(written)
  }

  // ------------------------------------------------------------------ attributes

  optionsChanged (value) {
    if (value !== null && !this.element.hasAttribute('source')) { this.#show(parseOptions(value)) }
  }

  sourceChanged (value) {
    // the former subscriptions of the source are dropped
    if (this.sourceEvents.length > 0) { this.unlisten(this.sourceEvents, 'sourceRefreshed') }
    this.sourceEvents = []
    this.unobserveItems()
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
    this.source = findOptionSource(value, 'rc-combobox')
    if (this.source === null) { return }
    this.sourceEvents = this.source.events
    if (this.sourceEvents.length > 0) { this.listen(this.sourceEvents, 'sourceRefreshed') }
    if (this.source.items.length > 0) {
      this.observeItems(this.source.items, 'sourceRefreshed') // called at the end of the task: it loads
    } else {
      this.#load()
    }
  }

  /** An item or an event of the source: its suggestions are asked again. */
  sourceRefreshed () { this.#load() }

  // ------------------------------------------------------------------ to extend

  /**
   * Cleans a typed value, when the field is left or `Enter` is pressed. To override; the default removes the spaces
   * at both ends, reduces the spaces inside to one, and gives a value that differs from a suggestion only by its case
   * the spelling of the suggestion.
   * @param {string} value - The content of the field.
   * @returns {string} The value to keep.
   */
  normalize (value) {
    const clean = value.trim().replace(/\s+/g, ' ')
    const lower = clean.toLocaleLowerCase()
    return this.list.find(option => option.value.toLocaleLowerCase() === lower)?.value ?? clean
  }

  // ------------------------------------------------------------------ DOM events

  inputLeft () {
    this.#settle()
    super.inputLeft()
  }

  inputKeyPressed (e) {
    if (this.isCommitKey(e)) { this.#settle() }
    super.inputKeyPressed(e)
  }

  // ------------------------------------------------------------------ internals

  // the typed value cleaned; when it changes, it is checked again (and committed with commit="input")
  #settle () {
    const typed = this.elField.value
    const value = this.normalize(typed)
    if (value === typed) { return }
    this.elField.value = value
    this.inputTyped()
  }

  #load () {
    if (this.source === null) { return }
    const request = ++this.request
    requestOptions(this.source, this.element).then(options => {
      if (request !== this.request || this.element === null) { return } // a later request, or the field is gone
      this.#show(options ?? [])
    }, error => console.error(`rc-combobox: the source '${this.element?.getAttribute('source')}' failed`, error))
  }

  #show (options) {
    this.list = (Array.isArray(options) ? options : []).map(normalizeOption)
    this.elList.replaceChildren(...this.list.map(({label, value}) => {
      const option = document.createElement('option')
      option.value = value
      if (label !== '') { option.label = label }
      return option
    }))
  }
}
WComponent.define('rc-combobox', RcCombobox)
