// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A modal window: a native `<dialog>`, shown above the page, which is greyed and cannot be used until the window
 * closes. The window closes with the value of the button chosen, and then runs the actions of its `data-*` attributes
 * (see the `actions` module) with this value in `data-value`: a dialog is a field whose value is the button chosen.
 *
 * ```html
 * <rc-dialog id="delete" label="Delete the card" data-event="cardDelete" data-param='{"id": 42}'>
 *   <p>The card will be deleted.</p>
 *   <footer>
 *     <rc-text-button data-close="cancel">Cancel</rc-text-button>
 *     <rc-text-button data-close="ok" default palette="action">Delete</rc-text-button>
 *   </footer>
 * </rc-dialog>
 *
 * <rc-icon-button icon="trash" data-dialog="delete">Delete</rc-icon-button>
 * ```
 *
 * ## Opening
 *
 * The window opens when it gets the `open` attribute: from the action `data-dialog="id"` of any element, or from
 * the application. Removing `open` closes it, with the value `''`.
 *
 * ## Closing
 *
 * | How | Value |
 * | --- | --- |
 * | a click on an element with `data-close`, after the actions of that element | the value of `data-close` |
 * | `Escape` | `cancel` |
 * | `Enter`, when the focus is on no button nor field | the element with `default` is clicked |
 *
 * When it closes, the dialog runs its actions with the value: `data-event` emits the event with `value` added to the
 * payload, `data-item` sets the item. The `value` property of the component is the value of the last closing.
 *
 * ## Content
 *
 * `label` is the title of the window. The content written in the element is the body; a `<footer>` in it holds the
 * buttons, on the right. The focus goes to the element with `autofocus`, or to the first button or field.
 *
 * ## Alerts and confirmations
 *
 * `showAlert()` and `showConfirm()` show a message in a window shared by the application, without writing it:
 *
 * ```js
 * import {showConfirm} from 'ricochet/ui/rc-dialog.mjs'
 *
 * showConfirm({title: 'Delete', message: 'The card will be deleted.', ok: 'Delete', event: 'cardDelete', param: {id: 42}})
 * // the event cardDelete is emitted with {id: 42, value: 'ok'} or {id: 42, value: 'cancel'}
 * ```
 *
 * ## Keyboard and look
 *
 * While the window is open, it alone receives the keys (see the `keyboard` module), and `Tab` stays inside it. The
 * window stands on `--rc-surface-raised`, with the shadow `--rc-elevation-3`; it keeps the palette of the dialog
 * (`palette` on `rc-dialog`).
 *
 * @module rc-dialog
 * @category ui
 */

import {css} from '../core/css.mjs'
import {runActions} from '../core/actions.mjs'
import {keyboard} from '../core/keyboard.mjs'
import {WComponent} from '../core/w-component.mjs'
import './rc-text-button.mjs'

css(`
rc-dialog > dialog {
  box-sizing: border-box;
  max-width: min(calc(100vw - 16px), 40rem);
  max-height: calc(100vh - 16px);
  padding: 0;
  border: 1px solid var(--rc-border);
  border-radius: 10px;
  background: var(--rc-surface-raised);
  color: var(--rc-text);
  box-shadow: var(--rc-elevation-3);
}
rc-dialog > dialog::backdrop { background: oklch(0% 0 0 / 45%); }
rc-dialog > dialog > header {
  padding: .6rem 1rem;
  border-bottom: 1px solid var(--rc-border);
  font-weight: 600;
  color: var(--rc-text-strong);
}
rc-dialog > dialog > header:empty { display: none; }
rc-dialog > dialog > div { padding: .75rem 1rem; }
rc-dialog > dialog > div > p:first-child { margin-top: 0; }
rc-dialog > dialog footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: .5rem; margin-top: .75rem; }
`, {layer: 'ricochet'})

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
let count = 0

/**
 * The component of `<rc-dialog>`.
 * @attr {boolean} [open] - The window is open.
 * @attr {string} [label] - Title of the window.
 * @attr {string} [data-item] - Configuration item set to the value when the window closes.
 * @attr {string} [data-*] - Other actions run when the window closes (see the `actions` module).
 */
export class RcDialog extends WComponent {
  static observedAttributes = ['label', 'open']
  static clickActions = false // its actions run when it closes
  static display = 'contents'

  /** The value of the last closing. */
  get value () { return this.element.dataset.value ?? '' }

  attach () {
    const element = this.element
    if (element.id === '') { element.id = `rc-dialog-${++count}` }
    this.elDialog = document.createElement('dialog')
    this.elTitle = document.createElement('header')
    this.elTitle.id = `${element.id}-title`
    this.elBody = document.createElement('div')
    this.elBody.append(...element.childNodes)
    this.elDialog.append(this.elTitle, this.elBody)
    this.elDialog.setAttribute('aria-labelledby', this.elTitle.id)
    element.replaceChildren(this.elDialog)
    this.closing = false
    // the browser asks to close on Escape: the dialog closes itself, with 'cancel'
    this.observeDom(this.elDialog, 'cancel', 'dialogCancelled')
    this.listen('rcDialogClose', 'dialogKeyPressed')
  }

  labelChanged (label) { this.elTitle.textContent = label ?? '' }

  openChanged (open) {
    if (open !== null) {
      this.#show()
    } else if (!this.closing) {
      this.#close('')
    }
  }

  dialogCancelled (e) {
    e.preventDefault()
    this.#close('cancel')
  }

  /**
   * Internal event: `Escape` or `Enter` pressed in the window.
   * @param {{id: string, key: string}} payload - The dialog and the key.
   */
  dialogKeyPressed ({id, key}) {
    if (id !== this.element.id) { return }
    if (key === 'Escape') {
      this.#close('cancel')
    } else {
      const chosen = this.elDialog.querySelector('[default]')
      if (chosen !== null) { (chosen.querySelector('button') ?? chosen).click() }
    }
  }

  // after the actions of the clicked element (the listener of the actions comes first)
  documentClicked (e) {
    if (!this.elDialog.contains(e.target)) { return }
    const closer = e.target.closest('[data-close]')
    if (closer === null || closer.closest('[disabled], [aria-disabled="true"]') !== null) { return }
    this.#close(closer.getAttribute('data-close'))
  }

  #show () {
    if (this.elDialog.open) { return }
    this.elDialog.showModal()
    const id = this.element.id
    keyboard.openLayer(this, [
      {key: 'Escape', action: {event: 'rcDialogClose', param: {id}}},
      {key: 'Enter', action: {event: 'rcDialogClose', param: {id}}}
    ])
    this.observeDom(document, 'click', 'documentClicked')
    const first = this.elDialog.querySelector('[autofocus]') ?? this.elBody.querySelector(FOCUSABLE)
    if (first !== null) { (first.querySelector?.('button') ?? first).focus() }
  }

  #close (value) {
    if (!this.elDialog.open) { return }
    this.elDialog.close()
    keyboard.closeLayer(this)
    this.unobserveDom(document, 'click', 'documentClicked')
    this.closing = true
    this.element.removeAttribute('open')
    this.closing = false
    this.element.dataset.value = value
    runActions(this.element.dataset)
  }
}
WComponent.define('rc-dialog', RcDialog)

// ------------------------------------------------------------------ alerts and confirmations

let shared = null

// the window shared by showAlert() and showConfirm(), created at the first call
const sharedDialog = () => {
  if (shared === null || !shared.isConnected) {
    shared = document.createElement('rc-dialog')
    shared.id = 'rc-message'
    shared.innerHTML = '<p></p><footer><rc-text-button data-close="cancel"></rc-text-button><rc-text-button data-close="ok" default></rc-text-button></footer>'
    document.body.append(shared)
  }
  return shared
}

const showMessage = ({title = '', message = '', ok = 'OK', cancel = null, event = null, param = {}}) => {
  const element = sharedDialog()
  element.setAttribute('label', title)
  element.querySelector('p').textContent = message
  const [cancelButton, okButton] = element.querySelectorAll('rc-text-button')
  okButton.setAttribute('label', ok)
  cancelButton.hidden = cancel === null
  cancelButton.setAttribute('label', cancel ?? '')
  if (event === null) {
    delete element.dataset.event
    delete element.dataset.param
  } else {
    element.dataset.event = event
    element.dataset.param = JSON.stringify(param)
  }
  element.setAttribute('open', '')
}

/**
 * Shows a message, with one button.
 * @param {object} options - The message.
 * @param {string} [options.title] - Title of the window.
 * @param {string} options.message - The message, as text.
 * @param {string} [options.ok=OK] - Label of the button.
 * @param {string} [options.event] - Event emitted when the window closes, with `value` (`ok` or `cancel`).
 * @param {object} [options.param] - Payload of the event.
 */
export const showAlert = options => showMessage({...options, cancel: null})

/**
 * Asks a confirmation, with two buttons; the answer is an event.
 * @param {object} options - The question.
 * @param {string} [options.title] - Title of the window.
 * @param {string} options.message - The question, as text.
 * @param {string} [options.ok=OK] - Label of the button that confirms.
 * @param {string} [options.cancel=Cancel] - Label of the button that cancels.
 * @param {string} options.event - Event emitted when the window closes, with `value`: `ok` or `cancel`.
 * @param {object} [options.param] - Payload of the event.
 */
export const showConfirm = options => showMessage({cancel: 'Cancel', ...options})
