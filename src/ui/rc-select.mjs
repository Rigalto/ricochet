// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A choice in a list: a native `<select>`, so that every browser shows its own list (a wheel on a phone). When the
 * user chooses an option, the actions of the `data-*` attributes run (see the `actions` module) with its value in
 * `data-value`.
 *
 * ```html
 * <rc-select data-item="map-size" options="Small#s|Medium#m|Large#l"></rc-select>
 * <rc-select data-event="layerChosen" none="None">
 *   <option value="roads">Roads</option>
 *   <option value="rivers">Rivers</option>
 * </rc-select>
 * <rc-select data-item="font" source="item font-list"></rc-select>
 * ```
 *
 * ## Options
 *
 * The options come from one of these, the later in the list winning:
 *
 * | From | How |
 * | --- | --- |
 * | the HTML | `<option>` and `<optgroup>` elements written inside `rc-select` |
 * | `options` | a text: options separated by `|`, each `label` or `label#value` (the value is the label when it is not given) |
 * | the `options` property | an array, from JavaScript (see below) |
 * | `source` | a named source of options, declared by the application (see below); `source="name argument"` |
 *
 * With `none="label"`, a first option is added, whose value is `''`: « no choice ».
 *
 * An option given as an object: `{label, value, disabled, group}`; options with the same `group` follow one another
 * and are shown under that title (`<optgroup>`). A string is an option whose label is its value.
 *
 * ## Value
 *
 * The `value` attribute gives the value; changing it later changes the choice. The choice of the user is not copied
 * to the attribute, as for a native `<select>`. The `value` property of the component (`element._component.value`)
 * reads and writes the value; it is `''` when no option is chosen. Writing the value runs no action.
 *
 * The value is kept when the options change: when they arrive later (a source that loads them), the option with that
 * value is chosen as soon as it is there. When it is not in the list, no option is chosen, or the `none` option.
 *
 * ## Actions
 *
 * | Use | How |
 * | --- | --- |
 * | A configuration item | `data-item="name"`: the select shows the item, and sets it. When the item changes elsewhere, the select follows. |
 * | An event | `data-event="name"`, with `data-param` for the payload: the event is emitted with `value` added to the payload. |
 * | A form | no action: the select is read with `value` and `valid`. |
 *
 * With `required`, the value `''` is invalid (attribute `invalid`): no action runs. A click on the select runs nothing
 * (`static clickActions = false`). `data-value` is written by the select: it must not be given.
 *
 * ## Sources of options
 *
 * An application declares its sources once, before its interface is mounted, with `defineOptionSources()`: a source
 * gives the options from the argument written after its name, at once or later (a `Promise`, for options loaded from a
 * file or a server). A source may also name the configuration items and the events after which its options must be
 * asked again: the select asks again by itself.
 *
 * ```js
 * import {defineOptionSources} from 'ricochet/ui/rc-select.mjs'
 *
 * defineOptionSources({
 *   // source="groups hom-not": the groups of a sheet, asked again when the groups change
 *   groups: {
 *     options: async sheet => (await loadGroups(sheet)).map(group => ({label: group.label, value: group.id})),
 *     events: ['groupsChanged']
 *   }
 * })
 * ```
 *
 * | Key | Content |
 * | --- | --- |
 * | `options` | `(argument, element) => options`, or a `Promise` of options |
 * | `items` | the configuration items whose change asks the options again: an array, or `argument => array` |
 * | `events` | the events that ask the options again: an array, or `argument => array` |
 *
 * A source given as a function is `{options: function}`. One source is built in: `item`, whose argument is the name of
 * a configuration item holding options in the format of the `options` attribute (`source="item font-list"`).
 *
 * ## Look
 *
 * The look of the fields (see the `field-style` module), with an arrow on the right. The list itself is drawn by the
 * browser, in the colours of the day or of the night.
 *
 * @module rc-select
 * @category ui
 */

import {css} from '../core/css.mjs'
import {runActions} from '../core/actions.mjs'
import {itemStore} from '../core/items.mjs'
import {WComponent} from '../core/w-component.mjs'
import './field-style.mjs'

css(`
rc-select { position: relative; }
rc-select > select { appearance: none; padding-right: 1.9em; cursor: pointer; }
rc-select > select:disabled { cursor: not-allowed; }
rc-select > select option, rc-select > select optgroup { background: var(--rc-surface-raised); color: var(--rc-text); }
rc-select > select option:disabled { color: var(--rc-disabled); }
rc-select::after {
  content: '';
  position: absolute;
  right: .75em;
  top: 50%;
  width: .4em;
  height: .4em;
  border-right: 2px solid var(--rc-text-muted);
  border-bottom: 2px solid var(--rc-text-muted);
  transform: translateY(-70%) rotate(45deg);
  pointer-events: none;
}
rc-select[disabled]::after { border-color: var(--rc-disabled); }
`, {layer: 'ricochet'})

const sources = new Map() // name → {options, items, events}
const warned = new Set()

/**
 * Reads options written as a text: options separated by `|`, each `label` or `label#value`.
 * @param {string} text - The options, as in the `options` attribute.
 * @returns {{label: string, value: string}[]} The options.
 */
export function parseOptions (text) {
  if (text === null || text === undefined || text === '') { return [] }
  return text.split('|').map(option => {
    const index = option.indexOf('#')
    return index === -1 ? {label: option, value: option} : {label: option.slice(0, index), value: option.slice(index + 1)}
  })
}

/**
 * Declares named sources of options, used by the `source` attribute. A name declared again is replaced.
 * @param {Object<string, Function|{options: Function, items: (string[]|Function), events: (string[]|Function)}>} table -
 *   Name → source.
 */
export function defineOptionSources (table) {
  for (const [name, definition] of Object.entries(table)) {
    const source = typeof definition === 'function' ? {options: definition} : definition
    if (typeof source?.options !== 'function') {
      console.error(`defineOptionSources: the source '${name}' has no options function`)
      continue
    }
    sources.set(name, {options: source.options, items: source.items ?? [], events: source.events ?? []})
    warned.delete(name)
  }
}

defineOptionSources({
  item: {options: name => parseOptions(itemStore().get(name) ?? ''), items: name => [name]}
})

const list = (value, argument) => typeof value === 'function' ? value(argument) : value

// an option as {label, value, disabled, group}
const normalize = option => typeof option === 'string'
  ? {label: option, value: option, disabled: false, group: null}
  : {label: `${option.label ?? option.value}`, value: `${option.value ?? option.label}`, disabled: option.disabled === true, group: option.group ?? null}

/**
 * The component of `<rc-select>`.
 * @attr {string} [value] - The value; a change changes the choice.
 * @attr {string} [options] - Options: `label` or `label#value`, separated by `|`.
 * @attr {string} [source] - Named source of options and its argument: `name argument`.
 * @attr {string} [none] - Label of a first option whose value is `''`.
 * @attr {boolean} [required] - The value `''` is invalid.
 * @attr {boolean} [disabled] - The select cannot be changed.
 * @attr {string} [label] - Name of the select for screen readers; the visible label is outside.
 * @attr {string} [data-item] - Configuration item shown and set by the select.
 * @attr {string} [data-*] - Other actions run when the user chooses an option (see the `actions` module).
 */
export class RcSelect extends WComponent {
  // the options before the value
  static observedAttributes = ['disabled', 'label', 'required', 'none', 'options', 'source', 'value']
  static clickActions = false
  static display = 'inline-block'

  /** The value: `''` when no option is chosen. */
  get value () { return this.elField.value }
  set value (value) { this.#want(value === null || value === undefined ? null : `${value}`) }

  /** The options, as `{label, value, disabled, group}`. A new array (or text) replaces them. */
  get options () { return this.list.map(option => ({...option})) }
  set options (options) { this.#show(typeof options === 'string' ? parseOptions(options) : options) }

  attach () {
    /** The `<select>`. */
    this.elField = document.createElement('select')
    this.wanted = null // the value to show, kept while the options change
    this.list = this.#written()
    this.element.replaceChildren(this.elField)
    this.valid = true
    this.request = 0 // the last request to a source: the answers of the former ones are ignored
    this.sourceEvents = []
    this.observeDom(this.elField, 'change', 'selectChanged')
    this.item = this.element.dataset.item
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
    this.#render()
  }

  // ------------------------------------------------------------------ attributes

  disabledChanged (value) { this.elField.disabled = value !== null }

  labelChanged (value) {
    if (value === null) {
      this.elField.removeAttribute('aria-label')
    } else {
      this.elField.setAttribute('aria-label', value)
    }
  }

  requiredChanged (value) {
    this.required = value !== null
    this.#check()
  }

  noneChanged (value) {
    this.none = value
    this.#render()
  }

  optionsChanged (value) {
    if (value !== null && !this.element.hasAttribute('source')) { this.#show(parseOptions(value)) }
  }

  sourceChanged (value) {
    // the former subscriptions of the source are dropped
    if (this.sourceEvents.length > 0) { this.unlisten(this.sourceEvents, 'sourceRefreshed') }
    this.sourceEvents = []
    this.unobserveItems()
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
    this.source = null
    if (value === null || value === '') { return }
    const [name, ...rest] = value.split(' ')
    const source = sources.get(name)
    if (source === undefined) {
      if (!warned.has(name)) {
        warned.add(name)
        console.warn(`rc-select: the source '${name}' is not declared (defineOptionSources)`)
      }
      return
    }
    this.source = {source, argument: rest.join(' ')}
    this.sourceEvents = list(source.events, this.source.argument)
    if (this.sourceEvents.length > 0) { this.listen(this.sourceEvents, 'sourceRefreshed') }
    const items = list(source.items, this.source.argument)
    if (items.length > 0) {
      this.observeItems(items, 'sourceRefreshed') // called at the end of the task with the current values: it loads
    } else {
      this.#load()
    }
  }

  valueChanged (value) { this.#want(value) }

  itemsChanged (items) {
    const value = items[this.item]
    if (value === undefined || value === null) { return } // not set yet: the value stays
    this.#want(value)
  }

  /** An item or an event of the source: its options are asked again. */
  sourceRefreshed () { this.#load() }

  // ------------------------------------------------------------------ DOM events

  selectChanged () {
    this.wanted = this.elField.value
    this.element.dataset.value = this.wanted
    if (this.#check()) { runActions(this.element.dataset) }
  }

  // ------------------------------------------------------------------ internals

  // the options written in the HTML
  #written () {
    const options = []
    for (const child of this.element.children) {
      if (child.localName === 'option') {
        options.push({label: child.textContent, value: child.value, disabled: child.disabled, group: null})
        if (child.selected && child.hasAttribute('selected') && !this.element.hasAttribute('value')) { this.wanted = child.value }
      } else if (child.localName === 'optgroup') {
        for (const option of child.querySelectorAll('option')) {
          options.push({label: option.textContent, value: option.value, disabled: option.disabled, group: child.label})
        }
      }
    }
    return options
  }

  #load () {
    if (this.source === null) { return }
    const {source, argument} = this.source
    const request = ++this.request
    let result
    try {
      result = source.options(argument, this.element)
    } catch (error) {
      console.error(`rc-select: the source '${this.element.getAttribute('source')}' failed`, error)
      return
    }
    Promise.resolve(result).then(options => {
      if (request !== this.request || this.element === null) { return } // a later request, or the select is gone
      this.#show(options ?? [])
    }, error => console.error(`rc-select: the source '${this.element?.getAttribute('source')}' failed`, error))
  }

  #show (options) {
    this.list = (Array.isArray(options) ? options : []).map(normalize)
    this.#render()
  }

  // the <option> elements, then the value
  #render () {
    const nodes = []
    if (this.none !== null && this.none !== undefined) { nodes.push(new Option(this.none, '')) }
    let group = null
    for (const {label, value, disabled, group: name} of this.list) {
      const option = new Option(label, value)
      option.disabled = disabled
      if (name === null) {
        group = null
        nodes.push(option)
      } else {
        if (group === null || group.label !== name) {
          group = document.createElement('optgroup')
          group.label = name
          nodes.push(group)
        }
        group.append(option)
      }
    }
    this.elField.replaceChildren(...nodes)
    this.#apply()
  }

  #want (value) {
    this.wanted = value
    this.#apply()
  }

  // shows the wanted value if it is in the list; else no choice, or the none option
  #apply () {
    if (this.wanted !== null) {
      this.elField.value = this.wanted
      if (this.elField.value !== this.wanted) { this.elField.selectedIndex = this.none !== null && this.none !== undefined ? 0 : -1 }
    }
    this.element.dataset.value = this.elField.value
    this.#check()
  }

  #check () {
    this.valid = !(this.required === true && this.elField.value === '')
    this.element.toggleAttribute('invalid', !this.valid)
    if (this.valid) {
      this.elField.removeAttribute('aria-invalid')
    } else {
      this.elField.setAttribute('aria-invalid', 'true')
    }
    return this.valid
  }
}
WComponent.define('rc-select', RcSelect)
