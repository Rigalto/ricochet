// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A field of several lines, whose height follows its content. It is an `rc-input` with a `<textarea>`: the same value,
 * actions, validation and look (see the `rc-input` module).
 *
 * ```html
 * <rc-textarea data-item="note-text" rows="3" max-rows="12" placeholder="Write a note"></rc-textarea>
 * <rc-textarea commit="change" data-event="cardText" data-param='{"id": 42}'></rc-textarea>
 * ```
 *
 * ## Height
 *
 * The field grows and shrinks with its text, between `rows` lines (default 2) and `max-rows` lines (default: no
 * limit); beyond `max-rows`, it scrolls. The user does not resize it by hand. Its width is the width of
 * `rc-textarea`, set by the application.
 *
 * The browsers that know the CSS property `field-sizing` (Chrome and Edge 123, Safari 26.2, Firefox 152) size the field
 * themselves. For the others, the component measures the text at each change, and again when the width of the field
 * changes or when it appears (a field inside a hidden block has no size until the block is shown).
 *
 * ## Differences with rc-input
 *
 * - `Enter` starts a new line: with `commit="enter"`, the actions run on `Ctrl` + `Enter` (`⌘` + `Enter` on a Mac);
 *   with `commit="change"`, when the field is left or on `Ctrl` + `Enter`.
 * - No `type`, `min` nor `max`; `pattern`, `check`, `required`, `maxlength`, `placeholder`, `readonly`, `disabled` and
 *   `label` are the same.
 *
 * @module rc-textarea
 * @category ui
 */

import {css} from '../core/css.mjs'
import {WComponent} from '../core/w-component.mjs'
import {RcInput} from './rc-input.mjs'

// padding (.3em above and below) and border (1px) of the field, from the look of rc-input
css(`
rc-textarea { display: inline-block; }
rc-textarea > textarea {
  display: block;
  resize: none;
  overflow-y: auto;
  field-sizing: content;
  min-height: calc(var(--rc-rows, 2) * 1lh + .6em + 2px);
  max-height: var(--rc-max-height, none);
}
`, {layer: 'ricochet'})

/**
 * The component of `<rc-textarea>`.
 * @attr {number} [rows=2] - Lines shown at least.
 * @attr {number} [max-rows] - Lines shown at most; beyond, the field scrolls.
 */
export class RcTextarea extends RcInput {
  /** Whether the browser sizes the field itself (`field-sizing: content`); false: the component measures it. */
  static fieldSizing = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content')

  static observedAttributes = ['placeholder', 'maxlength', 'readonly', 'disabled', 'label', 'rows', 'max-rows',
    'required', 'pattern', 'check', 'value']

  createField () { return document.createElement('textarea') }

  attach () {
    super.attach()
    this.measured = !RcTextarea.fieldSizing
    if (this.measured) {
      this.elField.style.fieldSizing = 'fixed'
      // the height is measured again when the width changes, or when the field appears
      this.width = -1
      this.resizeObserver = new ResizeObserver(() => {
        const width = this.elField.clientWidth
        if (width !== this.width) {
          this.width = width
          this.#fit()
        }
      })
      this.resizeObserver.observe(this.elField)
    }
  }

  detach () { this.resizeObserver?.disconnect() }

  rowsChanged (rows) {
    this.elField.style.setProperty('--rc-rows', `${this.#lines('rows', rows) ?? 2}`)
    this.fieldUpdated()
  }

  maxRowsChanged (rows) {
    const lines = this.#lines('max-rows', rows)
    if (lines === null) {
      this.elField.style.removeProperty('--rc-max-height')
    } else {
      this.elField.style.setProperty('--rc-max-height', `calc(${lines} * 1lh + .6em + 2px)`)
    }
    this.fieldUpdated()
  }

  /**
   * `Ctrl` + `Enter` (`⌘` + `Enter`) commits; `Enter` alone starts a new line.
   * @param {KeyboardEvent} e - The `keydown` event.
   * @returns {boolean} True if the key commits.
   */
  isCommitKey (e) { return e.key === 'Enter' && (e.ctrlKey || e.metaKey) }

  /** The height follows the text (browsers without `field-sizing`). */
  fieldUpdated () { if (this.measured) { this.#fit() } }

  #lines (attribute, value) {
    if (value === null || value === '') { return null }
    const lines = parseInt(value, 10)
    if (!(lines > 0)) {
      console.warn(`rc-textarea: ${attribute}="${value}" is not a number of lines, ignored`)
      return null
    }
    return lines
  }

  // the height of the text: measured with the smallest height, then set (min-height and max-height bound it)
  #fit () {
    const field = this.elField
    if (field === undefined || field.clientWidth === 0) { return } // not shown yet: the observer calls again
    const style = getComputedStyle(field)
    const page = document.scrollingElement
    const top = page?.scrollTop // the page may get shorter for a moment: its scroll is kept
    field.style.height = '0px'
    const height = field.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
    field.style.height = `${height}px`
    if (page && page.scrollTop !== top) { page.scrollTop = top }
  }
}
WComponent.define('rc-textarea', RcTextarea)
