// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A one-line input field. When its value is valid, it runs the actions of its `data-*` attributes (see the `actions`
 * module) with the value in `data-value`: at each keystroke, when the field is left, or when `Enter` is pressed.
 *
 * ```html
 * <rc-input data-item="board-width" required min="8" max="64" placeholder="From 8 to 64"></rc-input>
 * <rc-input type="search" commit="enter" data-event="helpSearch" placeholder="Searched term"></rc-input>
 * <rc-input check="float" data-event="speedChanged" data-param='{"axis": "x"}'></rc-input>
 * ```
 *
 * ## Value
 *
 * The `value` attribute gives the initial value; changing it later replaces the content of the field. What is typed
 * is not copied to the attribute, as for a native `<input>`. The `value` property of the component
 * (`element._component.value`) reads the value (`null` when it is invalid) and writes it; `valid` tells whether it is
 * valid. Writing the value, by the attribute or by the property, runs no action.
 *
 * ## Actions
 *
 * | Use | How |
 * | --- | --- |
 * | A configuration item | `data-item="name"`: the field shows the item, and sets it. When the item changes elsewhere, the field follows. |
 * | An event | `data-event="name"`, with `data-param` for the payload: the event is emitted with `value` added to the payload. |
 * | A form | no action: the field is read with `value` and `valid` when the form is validated. |
 *
 * The `commit` attribute tells when the actions run, always for a valid value only:
 *
 * | `commit` | Actions run |
 * | --- | --- |
 * | `input` (default) | at each keystroke |
 * | `change` | when the field is left or `Enter` is pressed, if the value changed |
 * | `enter` | when `Enter` is pressed |
 *
 * A click in the field runs nothing (`static clickActions = false`). `data-value` is written by the field: it must not
 * be given.
 *
 * ## Validation
 *
 * An empty field is valid unless it has `required`. A value that is not empty must pass every rule:
 *
 * | Attribute | Rule |
 * | --- | --- |
 * | `min`, `max` | the value is a number, not below `min`, not above `max` |
 * | `pattern` | the value matches the regular expression, as a whole (as in HTML) |
 * | `check` | the value passes the named checks, separated by spaces |
 *
 * An invalid field has the `invalid` attribute (and `aria-invalid` on its `<input>`): its border takes the colour
 * `--rc-danger`. The rules are checked again when one of these attributes changes.
 *
 * ## Named checks
 *
 * The application declares its checks once, with `defineChecks()`: a regular expression, a function
 * `(value, element) => boolean`, or `{test, attributes}` when the check reads attributes of the field, so that the
 * field is checked again when they change.
 *
 * ```js
 * import {defineChecks} from 'ricochet/ui/rc-input.mjs'
 *
 * defineChecks({
 *   float: /^[+-]?((\d+\.?\d*)|(\.\d+))$/,
 *   even: value => Number(value) % 2 === 0,
 *   notIn: {test: (value, element) => !element.getAttribute('exclude').split('|').includes(value), attributes: ['exclude']}
 * })
 * ```
 *
 * A check not declared is reported once in the console, and ignored.
 *
 * ## Extending the field
 *
 * A subclass changes the behaviour with these methods, and is defined with its own tag:
 *
 * - `transform(value)`: called at each keystroke; returns the value to put in the field (a shortcut typed by the user
 *   replaced by its value, for instance).
 * - `validate(value)`: returns whether the value is valid; call `super.validate(value)` to keep the rules above.
 * - `createField()`, `isCommitKey(e)`, `fieldUpdated()`: another kind of field, another key to commit, a call each
 *   time the value is checked (`rc-textarea` uses them).
 *
 * ```js
 * class DateInput extends RcInput {
 *   transform (value) { return value === '-' ? today() : value }
 *   validate (value) { return super.validate(value) && isDate(value) }
 * }
 * WComponent.define('app-date-input', DateInput)
 * ```
 *
 * ## Look
 *
 * The field (see the `field-style` module) stands on the surface of its block (`--rc-surface-raised`), with the border `--rc-border`, the focus ring
 * `--rc-focus`, the placeholder in `--rc-text-faint`, and the disabled tokens. It takes the width of `rc-input`, set by
 * the application; without one, the width of the browser.
 *
 * @module rc-input
 * @category ui
 */

import {runActions} from '../core/actions.mjs'
import {WComponent} from '../core/w-component.mjs'
import './field-style.mjs'

const checks = new Map() // name → {test, attributes}
const warned = new Set()
const COMMITS = new Set(['input', 'change', 'enter'])
// attributes copied to the <input>
const PASSED = {type: 'type', placeholder: 'placeholder', maxlength: 'maxlength', readonly: 'readonly', disabled: 'disabled', label: 'aria-label'}

/**
 * Declares named checks, used by the `check` attribute of the fields. A name declared again is replaced.
 * @param {Object<string, RegExp|Function|{test: RegExp|Function, attributes: string[]}>} table - Name → check: a
 *   regular expression, a function `(value, element) => boolean`, or an object with the attributes the check reads.
 */
export function defineChecks (table) {
  for (const [name, definition] of Object.entries(table)) {
    const check = definition instanceof RegExp || typeof definition === 'function' ? {test: definition} : definition
    if (!(check?.test instanceof RegExp) && typeof check?.test !== 'function') {
      console.error(`defineChecks: the check '${name}' is neither a regular expression nor a function`)
      continue
    }
    checks.set(name, {test: check.test, attributes: check.attributes ?? []})
    warned.delete(name)
  }
}

const passes = (check, value, element) => {
  if (check.test instanceof RegExp) {
    check.test.lastIndex = 0 // a regular expression with the g flag keeps its position
    return check.test.test(value)
  }
  return check.test(value, element) === true
}

/**
 * The component of `<rc-input>`.
 * @attr {string} [value] - Initial value; a change replaces the content of the field.
 * @attr {string} [type=text] - Type of the `<input>`: `text`, `number`, `search`, `password`, `email`, `url`, `tel`.
 * @attr {string} [placeholder] - Text shown while the field is empty.
 * @attr {number} [maxlength] - Maximum number of characters.
 * @attr {boolean} [required] - An empty field is invalid.
 * @attr {number} [min] - The value is a number, not below `min`.
 * @attr {number} [max] - The value is a number, not above `max`.
 * @attr {string} [pattern] - Regular expression the whole value must match.
 * @attr {string} [check] - Named checks, separated by spaces (see `defineChecks()`).
 * @attr {string} [commit=input] - When the actions run: `input`, `change` or `enter`.
 * @attr {boolean} [disabled] - The field cannot be changed.
 * @attr {boolean} [readonly] - The field can be selected, not changed.
 * @attr {string} [label] - Name of the field for screen readers; the visible label is outside the field.
 * @attr {string} [data-item] - Configuration item shown and set by the field.
 * @attr {string} [data-*] - Other actions run with a valid value (see the `actions` module).
 */
export class RcInput extends WComponent {
  // the rules before the value: the value is checked once they are all known
  static observedAttributes = ['type', 'placeholder', 'maxlength', 'readonly', 'disabled', 'label',
    'required', 'min', 'max', 'pattern', 'check', 'value']

  static clickActions = false
  static display = 'inline-block'

  /** The value, or `null` when it is invalid. */
  get value () { return this.valid ? this.elField.value : null }
  set value (value) { this.#set(`${value ?? ''}`) }

  attach () {
    /** The field: an `<input>`, or what `createField()` returns. */
    this.elField = this.createField()
    this.element.replaceChildren(this.elField)
    /** Whether the value is valid. */
    this.valid = true
    this.rules = {required: false, min: null, max: null, pattern: null, checks: []}
    this.committed = ''
    const commit = this.element.getAttribute('commit') ?? 'input'
    if (!COMMITS.has(commit)) { console.warn(`rc-input: unknown commit '${commit}', 'input' used`) }
    this.commit = COMMITS.has(commit) ? commit : 'input'
    this.observeDom(this.elField, 'input', 'inputTyped')
    this.observeDom(this.elField, 'change', 'inputLeft')
    this.observeDom(this.elField, 'keydown', 'inputKeyPressed')
    this.item = this.element.dataset.item
    if (this.item !== undefined && this.item !== '') { this.observeItems([this.item]) }
  }

  // ------------------------------------------------------------------ attributes

  typeChanged (value) { this.#pass('type', value) }
  placeholderChanged (value) { this.#pass('placeholder', value) }
  maxlengthChanged (value) { this.#pass('maxlength', value) }
  readonlyChanged (value) { this.#pass('readonly', value) }
  disabledChanged (value) { this.#pass('disabled', value) }
  labelChanged (value) { this.#pass('label', value) }

  requiredChanged (value) {
    this.rules.required = value !== null
    this.#check()
  }

  minChanged (value) {
    this.rules.min = this.#number('min', value)
    this.#check()
  }

  maxChanged (value) {
    this.rules.max = this.#number('max', value)
    this.#check()
  }

  patternChanged (value) {
    this.rules.pattern = null
    if (value !== null && value !== '') {
      try {
        this.rules.pattern = new RegExp(`^(?:${value})$`, 'u')
      } catch (error) {
        console.warn(`rc-input: the pattern '${value}' is not a valid regular expression, ignored`)
      }
    }
    this.#check()
  }

  checkChanged (value) {
    this.rules.checks = (value ?? '').split(' ').filter(name => name !== '')
    const attributes = this.rules.checks.flatMap(name => checks.get(name)?.attributes ?? [])
    if (attributes.length > 0) { this.observeAttributes(attributes, 'checkAttributeChanged') }
    this.#check()
  }

  /** An attribute read by a named check changed: the value is checked again. */
  checkAttributeChanged () { this.#check() }

  valueChanged (value) { this.#set(value ?? '') }

  itemsChanged (items) {
    const value = items[this.item]
    if (value === undefined || value === null) { return } // not set yet: the initial value stays
    if (value !== this.elField.value) { this.#set(value) } // the item just set by the field: the caret stays
  }

  // ------------------------------------------------------------------ to extend

  /**
   * Creates the field. To override for another kind of field (`rc-textarea` returns a `<textarea>`).
   * @returns {HTMLInputElement|HTMLTextAreaElement} The field.
   */
  createField () {
    const field = document.createElement('input')
    field.type = 'text'
    return field
  }

  /**
   * Whether a key commits the value (`commit="change"` or `"enter"`). To override; the default: `Enter`.
   * @param {KeyboardEvent} e - The `keydown` event.
   * @returns {boolean} True if the key commits.
   */
  isCommitKey (e) { return e.key === 'Enter' }

  /** Called each time the value is checked (typed, written, or a rule changed). To override; does nothing. */
  fieldUpdated () {}

  /**
   * Called at each keystroke: returns the value to put in the field. To override; the default keeps the value.
   * @param {string} value - The content of the field.
   * @returns {string} The value to put in the field.
   */
  transform (value) { return value }

  /**
   * Whether a value is valid: `required`, `min`, `max`, `pattern` and the named checks. To override, calling
   * `super.validate(value)` to keep these rules.
   * @param {string} value - The value to check.
   * @returns {boolean} True if the value is valid.
   */
  validate (value) {
    const {required, min, max, pattern} = this.rules
    if (value === '') { return !required }
    if (min !== null || max !== null) {
      const number = Number(value)
      if (Number.isNaN(number) || (min !== null && number < min) || (max !== null && number > max)) { return false }
    }
    if (pattern !== null && !pattern.test(value)) { return false }
    for (const name of this.rules.checks) {
      const check = checks.get(name)
      if (check === undefined) {
        if (!warned.has(name)) {
          warned.add(name)
          console.warn(`rc-input: the check '${name}' is not declared (defineChecks), ignored`)
        }
        continue
      }
      if (!passes(check, value, this.element)) { return false }
    }
    return true
  }

  // ------------------------------------------------------------------ DOM events

  inputTyped () {
    const typed = this.elField.value
    const value = this.transform(typed)
    if (value !== typed) { this.elField.value = value }
    if (this.#check() && this.commit === 'input') { this.#commit() }
  }

  inputLeft () {
    if (this.commit === 'change' && this.valid && this.elField.value !== this.committed) { this.#commit() }
  }

  inputKeyPressed (e) {
    if (!this.isCommitKey(e) || !this.valid) { return }
    if (this.commit === 'enter' || (this.commit === 'change' && this.elField.value !== this.committed)) { this.#commit() }
  }

  // ------------------------------------------------------------------ internals

  #pass (attribute, value) {
    const name = PASSED[attribute]
    if (value === null) {
      this.elField.removeAttribute(name)
    } else {
      this.elField.setAttribute(name, value)
    }
  }

  #number (attribute, value) {
    if (value === null || value === '') { return null }
    const number = Number(value)
    if (Number.isNaN(number)) {
      console.warn(`rc-input: ${attribute}="${value}" is not a number, ignored`)
      return null
    }
    return number
  }

  // checks the value, shows the result, returns it
  #check () {
    this.valid = this.validate(this.elField.value)
    this.element.toggleAttribute('invalid', !this.valid)
    if (this.valid) {
      this.elField.removeAttribute('aria-invalid')
    } else {
      this.elField.setAttribute('aria-invalid', 'true')
    }
    this.fieldUpdated()
    return this.valid
  }

  // a value written by the application: shown and checked, no action
  #set (value) {
    this.elField.value = value
    this.committed = value
    this.#check()
  }

  #commit () {
    const value = this.elField.value
    this.committed = value
    this.element.dataset.value = value
    runActions(this.element.dataset)
  }
}
WComponent.define('rc-input', RcInput)
