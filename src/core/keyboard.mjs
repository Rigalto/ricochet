// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Centralised, layered keyboard handling. A key press is handled by the highest layer that listens for it:
 *
 * 1. the **window open on top** (a dropdown, a dialog, an alert), when one is open: it alone receives the keys;
 * 2. the **module** that has the keyboard focus, if any: `Escape` releases the focus;
 * 3. the **floating buttons**, all groups together;
 * 4. the **view**, if no floating button handled the key.
 *
 * ## Windows
 *
 * The windows that open above the page form a stack: a window calls `openLayer(owner, keys)` when it opens and
 * `closeLayer(owner)` when it closes. The window on top receives every key: those it declares run their actions, the
 * others are dropped; `Escape` is a key it declares like any other (close, cancel). Each change of the stack emits
 * `overlayChanged {open}`, with the number of open windows: an application hides what must not show above a window.
 * The layers of a component are closed when it is detached.
 *
 * The former API stays, deprecated: the events `dropdownOpen` and `dropdownClose` open and close a window whose
 * `Escape` emits `dropdownClose` and whose keys are given by `setModalKeys()`; `setAlertKeys()` opens (or closes, with
 * `null`) a window for an alert.
 *
 * Keys typed in an `<input>`, a `<textarea>` or a `<select>` are left to the browser, and so are `Tab`, `Space` and
 * `Enter` when a control has the focus (a button, a link, an element with `tabindex`): they move the focus or press the
 * control. The arrows, `Home` and `End` are left to the component when a radio button or a tab has the focus
 * (`role="radio"`, `role="tab"`): they move in its group.
 *
 * ## Declaring keys
 *
 * Each layer receives an array of `{key, action}` objects. `key` is a string, an array of strings or a regular
 * expression, matched against the key written as `Ctrl-Shift-Alt-<key>` (modifiers in this order, only those
 * pressed): `u`, `Shift-U`, `Ctrl-u`, `Alt-Shift-U`, `ArrowRight`, `0` to `9` and `.` for the numeric keypad,
 * `Shift-0` for the main keyboard… `action` holds what to do:
 *
 * - `event` and `param`: emits the event, with `param` plus `key`, `shift`, `ctrl` and `alt` as payload;
 * - `item` and `value`: sets a configuration item;
 * - `click`: an element to click.
 *
 * The default action of the browser is prevented for every handled key, and always for `Space`, the arrows, `Tab`
 * and `Alt`.
 *
 * ## Keys currently pressed
 *
 * Games read the keys held down at any time: `keyboard.keyboard` holds physical codes (`KeyA`, `ShiftLeft`,
 * `ArrowUp`… — the `z` key of a French keyboard is `KeyW`), `keyboard.keys` holds characters as typed. Nothing is
 * recorded while `Ctrl` is pressed.
 *
 * @module keyboard
 * @listens dropdownOpen - Deprecated: a window of the former API opens.
 * @listens dropdownClose - Deprecated: the window of the former API closes.
 * @listens {{module: string}} moduleFocus - A module takes the keyboard focus (`''`: none).
 * @fires dropdownClose - Deprecated: `Escape` pressed while a window of the former API is open.
 * @fires {{open: number}} overlayChanged - A window opened or closed: `open` windows are open.
 * @fires {{module: string}} moduleFocus - `Escape` pressed while a module has the focus (`module: ''`).
 */

import {bus} from './bus.mjs'
import {itemStore} from './items.mjs'

const PREVENTED_CODES = new Set(['Space', 'AltLeft', 'AltRight', 'ArrowUp', 'ArrowDown', 'Digit4', 'Tab'])
// keys left to the browser on a focused control: they move the focus or press it
const CONTROL_KEYS = new Set(['Tab', 'Space', 'Enter', 'NumpadEnter'])
const CONTROLS = 'button, a[href], select, summary, [contenteditable=""], [contenteditable="true"], [tabindex]'
// keys typed in a field are left to the browser
const FIELDS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
// keys left to the component on a focused item of a group (a radio button, a tab): they move in the group
const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])
const GROUP_ITEMS = '[role="radio"], [role="tab"]'

// the focused element is a control (a button, a link…), not the page or a canvas
const onControl = target => target instanceof Element && target !== document.body && target.matches(CONTROLS)

// the key keeps its meaning on the focused element
const leftToControl = e => (CONTROL_KEYS.has(e.code) && onControl(e.target)) ||
  (ARROW_KEYS.has(e.code) && e.target instanceof Element && e.target.matches(GROUP_ITEMS))

const LEGACY_MODAL = {name: 'former modal'} // owners of the windows of the former API
const LEGACY_ALERT = {name: 'former alert'}

/**
 * The keyboard controller. One instance, `keyboard`, serves the whole application.
 */
export class KeyboardController {
  #layers = [] // the open windows, the top one last: {owner, keys}
  #modalKeys = []
  #moduleKeys = {}
  #moduleOwners = {}
  #floatingKeys = {}
  #viewKeys = null
  #viewOwner = null

  constructor () {
    this.module = '' // name of the module that has the keyboard focus, '' if none
    /** Physical codes of the keys held down. */
    this.keyboard = new Set()
    /** Characters of the keys held down. */
    this.keys = new Set()

    bus.on('dropdownOpen', () => { this.openLayer(LEGACY_MODAL, this.#legacyModalKeys()) })
    bus.on('dropdownClose', () => {
      this.#modalKeys = []
      this.closeLayer(LEGACY_MODAL)
    })
    bus.on('moduleFocus', payload => { this.module = payload?.module ?? '' })
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', e => this.keydownHandler(e))
      window.addEventListener('keyup', e => this.keyupHandler(e))
    }
  }

  /**
   * Records the release of a key.
   * @param {KeyboardEvent} e - The `keyup` event.
   */
  keyupHandler (e) {
    if (PREVENTED_CODES.has(e.code) && !leftToControl(e) && !FIELDS.has(e.target.tagName)) { e.preventDefault() }
    this.keyboard.delete(e.code)
    this.keys.delete(e.key)
  }

  /**
   * Records a key press and hands it to the highest layer that listens for it.
   * @param {KeyboardEvent} e - The `keydown` event.
   */
  keydownHandler (e) {
    if (FIELDS.has(e.target.tagName)) { return }
    // on a focused control, Tab, Space and Enter keep their browser meaning: move the focus, press the control;
    // on a radio button or a tab, the arrows move in its group
    if (leftToControl(e)) { return }
    if (PREVENTED_CODES.has(e.code)) { e.preventDefault() }
    if (e.getModifierState('CapsLock')) { this.keyboard.add('CapsLock') } else { this.keyboard.delete('CapsLock') }
    const pressed = e.key
    if (!e.ctrlKey) {
      this.keyboard.add(e.code)
      this.keys.add(pressed)
    }
    if (pressed === 'Control' || pressed === 'Shift' || pressed === 'Alt') { return }

    if (this.#layers.length > 0) {
      // the window on top takes every key: the keys it does not declare reach no other layer
      this.#run(e, this.#layers.at(-1).keys)
    } else if (this.module !== '') {
      if (pressed === 'Escape') {
        bus.emit('moduleFocus', {module: ''})
      } else {
        this.#run(e, this.#moduleKeys[this.module])
      }
    } else {
      let handled = false
      for (const keys of Object.values(this.#floatingKeys)) { handled = this.#run(e, keys) || handled }
      if (!handled) { this.#run(e, this.#viewKeys) }
    }
  }

  // runs the actions of the keys that match; returns true if at least one matched
  #run (e, keys) {
    if (keys === null || keys === undefined) { return false }
    const pressed = (e.ctrlKey ? 'Ctrl-' : '') + (e.shiftKey ? 'Shift-' : '') + (e.altKey ? 'Alt-' : '') + e.key
    let handled = false
    for (const {key, action} of keys) {
      const match = Array.isArray(key) ? key.includes(pressed)
        : key instanceof RegExp ? key.test(pressed)
          : key === pressed
      if (match) {
        this.#action(e, pressed, action)
        handled = true
      }
    }
    return handled
  }

  #action (e, key, {event, param, item, value, click}) {
    e.stopPropagation()
    e.preventDefault()
    if (event !== undefined) { bus.emit(event, {...param, key, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey}) }
    if ((item !== undefined) && (value !== undefined)) { itemStore().setItem(item, value) }
    if (click !== undefined) { click.click() }
  }

  // ------------------------------------------------------------------ windows

  /**
   * Opens the layer of a window, on top of the others; called again by the same owner, it changes the keys and the
   * window stays where it is in the stack.
   * @param {object} owner - The window (a component).
   * @param {Array} [keys] - Array of `{key, action}`.
   */
  openLayer (owner, keys = []) {
    console.assert(Array.isArray(keys), 'KeyboardController.openLayer: an array is expected')
    const layer = this.#layers.find(l => l.owner === owner)
    if (layer !== undefined) {
      layer.keys = keys
      return
    }
    this.#layers.push({owner, keys})
    this.#overlayChanged()
  }

  /**
   * Closes the layer of a window.
   * @param {object} owner - The window given to `openLayer()`.
   */
  closeLayer (owner) {
    const index = this.#layers.findIndex(l => l.owner === owner)
    if (index === -1) { return }
    this.#layers.splice(index, 1)
    this.#overlayChanged()
  }

  /** Number of open windows. */
  get layers () { return this.#layers.length }

  /** Whether a window opens on top of the page. */
  get modal () { return this.#layers.length > 0 }

  /** Whether an alert of the former API is shown. */
  get alert () { return this.#layers.some(l => l.owner === LEGACY_ALERT) }

  #overlayChanged () { bus.emit('overlayChanged', {open: this.#layers.length}) }

  #legacyModalKeys () { return [{key: 'Escape', action: {event: 'dropdownClose'}}, ...(this.#modalKeys ?? [])] }

  /**
   * Keys of the alert shown; `null` when the alert closes.
   * @deprecated Open a window with `openLayer()`.
   * @param {Array|null} keys - Array of `{key, action}`.
   */
  setAlertKeys (keys) {
    if (keys === null) {
      this.closeLayer(LEGACY_ALERT)
      return
    }
    console.assert(Array.isArray(keys), 'KeyboardController.setAlertKeys: an array is expected')
    this.openLayer(LEGACY_ALERT, keys)
  }

  /**
   * Keys of the modal opened by `dropdownOpen`.
   * @deprecated Open a window with `openLayer()`.
   * @param {Array|null} keys - Array of `{key, action}`.
   */
  setModalKeys (keys) {
    if (keys !== null) { console.assert(Array.isArray(keys), 'KeyboardController.setModalKeys: an array is expected') }
    this.#modalKeys = keys ?? []
    if (this.#layers.some(l => l.owner === LEGACY_MODAL)) { this.openLayer(LEGACY_MODAL, this.#legacyModalKeys()) }
  }

  /**
   * Keys of a module, used while it has the keyboard focus; `null` forgets them.
   * @param {string} module - Module name.
   * @param {Array|null} keys - Array of `{key, action}`.
   * @param {object} [owner] - The component that declares them (see `release()`).
   */
  setModuleKeys (module, keys, owner = null) {
    if (keys !== null) { console.assert(Array.isArray(keys), 'KeyboardController.setModuleKeys: an array is expected') }
    this.#moduleKeys[module] = keys
    this.#moduleOwners[module] = owner
  }

  /**
   * Keys of a group of floating buttons. All groups are active together.
   * @param {string} group - Group name.
   * @param {Array} keys - Array of `{key, action}`.
   */
  setFloatingKeys (group, keys) {
    console.assert(Array.isArray(keys), 'KeyboardController.setFloatingKeys: an array is expected')
    this.#floatingKeys[group] = keys
  }

  /**
   * Keys of the current view; `null` forgets them.
   * @param {Array|null} keys - Array of `{key, action}`.
   * @param {object} [owner] - The component that declares them (see `release()`).
   */
  setViewKeys (keys, owner = null) {
    if (keys !== null) { console.assert(Array.isArray(keys), 'KeyboardController.setViewKeys: an array is expected') }
    this.#viewKeys = keys
    this.#viewOwner = owner
  }

  /**
   * Forgets the module and view keys declared by a component, unless another component has replaced them since, and
   * closes its windows. Called when a component is detached: a new view is often mounted before the former one is
   * detached.
   * @param {object} owner - The component.
   */
  release (owner) {
    this.closeLayer(owner)
    if (this.#viewOwner === owner) {
      this.#viewKeys = null
      this.#viewOwner = null
    }
    for (const [module, moduleOwner] of Object.entries(this.#moduleOwners)) {
      if (moduleOwner === owner) {
        this.#moduleKeys[module] = null
        this.#moduleOwners[module] = null
      }
    }
  }
}

/** The keyboard controller of the application. */
export const keyboard = new KeyboardController()
