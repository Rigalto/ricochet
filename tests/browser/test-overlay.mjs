// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-overlay.mjs — open tests/browser/index.html in a browser
// Windows above the page: the layers of the keyboard, rc-dropdown, rc-dialog; the floating buttons.

import {describe, assert} from '../kernel.mjs'
import {WComponent} from '../../src/core/w-component.mjs'
import {bus} from '../../src/core/bus.mjs'
import {keyboard} from '../../src/core/keyboard.mjs'
import {RcDropdown} from '../../src/ui/rc-dropdown.mjs'
import {showAlert, showConfirm} from '../../src/ui/rc-dialog.mjs'
import '../../src/ui/rc-checkbox.mjs'
import '../../src/ui/rc-floating.mjs'

const sandbox = document.getElementById('sandbox')
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
const $ = selector => document.querySelector(selector)
const key = (code, target = document.activeElement ?? document.body) =>
  target.dispatchEvent(new KeyboardEvent('keydown', {key: code, code, bubbles: true, cancelable: true}))
const press = target => target.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}))
const got = []
const onEvent = payload => got.push(payload)
const overlays = []
const onOverlay = payload => overlays.push(payload.open)
bus.on('ovAction', onEvent)
bus.on('overlayChanged', onOverlay)

await describe('Keyboard — layers of the windows', async () => {
  const owner1 = {}
  const owner2 = {}
  keyboard.setViewKeys([{key: 'v', action: {event: 'ovAction', param: {from: 'view'}}}], owner1)
  got.length = 0
  overlays.length = 0
  key('v', document.body)
  assert('no window: the view gets the key', got.length === 1 && got[0].from === 'view')
  keyboard.openLayer(owner1, [{key: 'a', action: {event: 'ovAction', param: {from: 'one'}}}])
  keyboard.openLayer(owner2, [{key: 'b', action: {event: 'ovAction', param: {from: 'two'}}}])
  assert('each opening emits overlayChanged with the number of windows', overlays.join() === '1,2' && keyboard.layers === 2 && keyboard.modal)
  got.length = 0
  key('a', document.body)
  key('v', document.body)
  key('b', document.body)
  assert('the window on top alone gets the keys', got.length === 1 && got[0].from === 'two')
  keyboard.openLayer(owner1, [{key: 'c', action: {event: 'ovAction', param: {from: 'one again'}}}])
  assert('opened again: the keys change, the window stays below', keyboard.layers === 2 && overlays.length === 2)
  keyboard.closeLayer(owner2)
  key('c', document.body)
  assert('closed: the window below gets the keys', got.at(-1).from === 'one again' && overlays.at(-1) === 1)
  keyboard.release(owner1)
  got.length = 0
  key('v', document.body)
  assert('release() closes the windows of a component', keyboard.layers === 0 && overlays.at(-1) === 0)
  // the former API
  keyboard.setViewKeys([{key: 'v', action: {event: 'ovAction', param: {from: 'view'}}}], owner1)
  const closes = []
  const onClose = () => closes.push(1)
  bus.on('dropdownClose', onClose)
  bus.emit('dropdownOpen', {})
  keyboard.setModalKeys([{key: 'm', action: {event: 'ovAction', param: {from: 'modal'}}}])
  got.length = 0
  key('m', document.body)
  key('v', document.body)
  assert('former API: dropdownOpen opens a window with the keys of setModalKeys()', keyboard.layers === 1 && got.length === 1 && got[0].from === 'modal')
  key('Escape', document.body)
  assert('… Escape emits dropdownClose, which closes it', closes.length === 1 && keyboard.layers === 0)
  bus.off('dropdownClose', onClose)
  keyboard.setAlertKeys([{key: 'Enter', action: {event: 'ovAction', param: {from: 'alert'}}}])
  assert('former API: setAlertKeys() opens a window', keyboard.alert && keyboard.layers === 1)
  keyboard.setAlertKeys(null)
  assert('… null closes it', !keyboard.alert && keyboard.layers === 0)
  keyboard.release(owner1)
})

await describe('rc-dropdown', async () => {
  sandbox.innerHTML = `
    <rc-dropdown id="d1" icon="filter" label="Filter" title="Filter the table">
      <rc-checkbox id="box">Done</rc-checkbox>
      <rc-text-button id="reset" data-event="ovAction" data-param='{"from": "reset"}' data-close>Reset</rc-text-button>
      <rc-dropdown id="d2" label="More"><span id="inner">inner</span><button id="innerButton">x</button></rc-dropdown>
    </rc-dropdown>
    <rc-dropdown id="d3" label="Columns" content="ov-content" content-attr='brick="lnk"'></rc-dropdown>
    <button id="outside">outside</button>`
  await tick()
  const d1 = $('#d1')
  const trigger = d1.querySelector('rc-icon-button > button')
  const win = d1.querySelector(':scope > [popover]')
  assert('a button and a closed window holding the content', trigger !== null && win !== null && !d1._component.open && win.contains($('#box')))
  assert('label and title on the button; aria', d1.querySelector('rc-icon-button').getAttribute('label') === 'Filter' &&
    d1.querySelector('rc-icon-button').title === 'Filter the table' && win.title === '' && trigger.getAttribute('aria-expanded') === 'false')
  d1.setAttribute('icon', 'sort')
  assert('the icon may change: the button follows', d1.querySelector('rc-icon-button').getAttribute('icon') === 'sort')
  d1.setAttribute('icon', 'filter')
  overlays.length = 0
  trigger.click()
  assert('a click opens the window above the page', d1._component.open && keyboard.layers === 1 && overlays.at(-1) === 1 &&
    trigger.getAttribute('aria-expanded') === 'true')
  assert('the focus goes into the window', win.contains(document.activeElement))
  await frame()
  const t = trigger.getBoundingClientRect()
  const w = win.getBoundingClientRect()
  assert(`placed below the button (${RcDropdown.anchorPositioning ? 'anchor positioning' : 'computed'})`, w.top >= t.bottom - 1 && Math.abs(w.left - t.left) <= 2)
  $('#box button').click()
  assert('the content works, the window stays open', $('#box')._component.value === 'yes' && d1._component.open)
  trigger.click()
  assert('a second click closes it; the focus comes back to the button', !d1._component.open && keyboard.layers === 0 && document.activeElement === trigger)
  trigger.click()
  key('Escape')
  assert('Escape closes it', !d1._component.open && keyboard.layers === 0)
  trigger.click()
  press($('#outside'))
  assert('a press outside closes it', !d1._component.open)
  trigger.click()
  press($('#box'))
  assert('a press inside does not', d1._component.open)
  got.length = 0
  $('#reset button').click()
  assert('data-close: the actions run, then the window closes', got.length === 1 && got[0].from === 'reset' && !d1._component.open)
  trigger.click()
  bus.emit('dropdownClose', {id: 'other'})
  assert('dropdownClose with another id: stays open', d1._component.open)
  bus.emit('dropdownClose', {})
  assert('dropdownClose: closes', !d1._component.open)
  // nested dropdowns
  trigger.click()
  $('#d2 button').click()
  assert('a dropdown in a dropdown: two windows', $('#d2')._component.open && d1._component.open && keyboard.layers === 2)
  press($('#inner'))
  assert('a press in the inner window keeps both', $('#d2')._component.open && d1._component.open)
  key('Escape')
  assert('Escape closes the window on top only', !$('#d2')._component.open && d1._component.open && keyboard.layers === 1)
  key('Escape')
  // a component created at each opening
  class OvContent extends WComponent {
    attach () { this.element.textContent = `content of ${this.element.getAttribute('brick')}` }
  }
  WComponent.define('ov-content', OvContent)
  const d3 = $('#d3')
  assert('content: nothing before the opening; a text button without icon', d3.querySelector('[popover]').children.length === 0 &&
    d3.querySelector('rc-text-button button').textContent === 'Columns')
  d3.querySelector('rc-text-button button').click()
  const created = d3.querySelector('ov-content')
  assert('content: the component is created at the opening, with its attributes', created?._component !== undefined && created.textContent === 'content of lnk')
  key('Escape')
  assert('… and removed at the closing', d3.querySelector('ov-content') === null)
  // computed placement, near the right edge
  RcDropdown.anchorPositioning = false
  sandbox.insertAdjacentHTML('beforeend', '<div style="text-align: right"><rc-dropdown id="d4" label="Right"><div style="width: 300px; height: 40px">wide</div></rc-dropdown></div>')
  RcDropdown.anchorPositioning = CSS.supports('anchor-name: --rc')
  await tick()
  $('#d4 button').click()
  await frame()
  const r = $('#d4 [popover]').getBoundingClientRect()
  const b = $('#d4 rc-text-button').getBoundingClientRect()
  assert('computed placement: below the button, moved to the left to stay in the window', r.top >= b.bottom && r.right <= window.innerWidth - 7 && r.left < b.left)
  key('Escape')
  sandbox.innerHTML = ''
  await tick()
  assert('no window left open', keyboard.layers === 0)
})

await describe('rc-dialog', async () => {
  sandbox.innerHTML = `
    <rc-dialog id="dlg" label="Delete the card" data-event="ovAction" data-param='{"from": "dialog"}'>
      <p>The card will be deleted.</p>
      <footer>
        <rc-text-button id="no" data-close="cancel">Cancel</rc-text-button>
        <rc-text-button id="yes" data-close="ok" default>Delete</rc-text-button>
      </footer>
    </rc-dialog>
    <rc-icon-button id="open" icon="trash" data-dialog="dlg">Delete</rc-icon-button>`
  await tick()
  const element = $('#dlg')
  const dialog = element.querySelector('dialog')
  assert('a closed native dialog, with its title and its content', dialog !== null && !dialog.open && dialog.querySelector('header').textContent === 'Delete the card' &&
    dialog.querySelector('p') !== null)
  got.length = 0
  overlays.length = 0
  $('#open button').click()
  assert('data-dialog opens it, modal, above the page', dialog.open && dialog.matches(':modal') && element.hasAttribute('open') && keyboard.layers === 1 && overlays.at(-1) === 1)
  assert('the focus goes to its first button', dialog.contains(document.activeElement))
  $('#yes button').click()
  assert('data-close: closes, then the actions run with the value', !dialog.open && !element.hasAttribute('open') && got.length === 1 &&
    got[0].from === 'dialog' && got[0].value === 'ok' && element._component.value === 'ok' && keyboard.layers === 0)
  element.setAttribute('open', '')
  key('Escape')
  assert('Escape: cancel', !dialog.open && got.at(-1).value === 'cancel')
  element.setAttribute('open', '')
  document.activeElement.blur()
  key('Enter', document.body)
  assert('Enter: the default button', !dialog.open && got.at(-1).value === 'ok')
  element.setAttribute('open', '')
  dialog.dispatchEvent(new Event('cancel', {cancelable: true}))
  assert('the cancel request of the browser: cancel', !dialog.open && got.at(-1).value === 'cancel')
  element.setAttribute('open', '')
  element.removeAttribute('open')
  assert('open removed: closes with an empty value', !dialog.open && got.at(-1).value === '' && keyboard.layers === 0)
  // a click outside the window: the backdrop, whose target is the dialog itself
  const outside = (target, x, y) => target.dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: x, clientY: y}))
  got.length = 0
  element.setAttribute('open', '')
  outside(dialog, 2, 2)
  assert('without closedby: a click outside does not close it', dialog.open && got.length === 0)
  element.setAttribute('closedby', 'any')
  const box = dialog.getBoundingClientRect()
  outside(dialog, box.left + 5, box.top + 5)
  assert('closedby="any": a click inside, on the window itself, does not close it', dialog.open)
  outside(dialog, 2, 2)
  assert('closedby="any": a click outside closes it, cancel', !dialog.open && got.at(-1).value === 'cancel' && keyboard.layers === 0)
  element.removeAttribute('closedby')
  sandbox.innerHTML = ''
  await tick()
  got.length = 0
  showConfirm({title: 'Delete', message: 'Sure?', ok: 'Yes', cancel: 'No', event: 'ovAction', param: {from: 'confirm'}})
  const shared = $('#rc-message')
  const buttons = () => [...shared.querySelectorAll('footer rc-text-button')]
  assert('showConfirm: a window with the message and two buttons', shared.querySelector('dialog').open && shared.querySelector('p').textContent === 'Sure?' &&
    buttons().map(b => b.hidden ? '-' : b.querySelector('button').textContent).join() === 'No,Yes')
  buttons()[0].querySelector('button').click()
  assert('… the answer is the event', got.length === 1 && got[0].from === 'confirm' && got[0].value === 'cancel')
  showAlert({message: 'Saved.'})
  assert('showAlert: one button, OK', buttons()[0].hidden && buttons()[1].querySelector('button').textContent === 'OK' && shared.querySelector('header').textContent === '')
  key('Escape')
  assert('… no event when none is given', got.length === 1 && !shared.querySelector('dialog').open && keyboard.layers === 0)
  shared.remove()
  await tick()
})

await describe('rc-floating-bar, rc-floating-group, rc-floating-button', async () => {
  sandbox.innerHTML = `
    <div id="view" style="height: 3000px">content</div>
    <rc-floating-bar id="bar">
      <rc-floating-group name="ovArrows"><rc-floating-button id="f1" icon="caretleft" key="Ctrl-ArrowLeft" data-event="ovAction" data-param='{"from": "left"}'></rc-floating-button></rc-floating-group>
      <rc-floating-group name="ovCard" side="right" gradient="right">
        <rc-floating-button id="f2" icon="add" title="New" data-event="ovAction" data-param='{"from": "new"}'></rc-floating-button>
        <rc-floating-button id="f3" icon="copy" key="Ctrl-d" data-event="ovAction" data-param='{"from": "dup"}'></rc-floating-button>
        <rc-floating-button id="f4" icon="pen" key="Ctrl-m" data-event="ovAction" data-param='{"from": "edit"}'></rc-floating-button>
      </rc-floating-group>
    </rc-floating-bar>`
  await tick()
  const bar = $('#bar')
  const rank = id => $(`#${id}`).style.getPropertyValue('--rc-rank')
  const ctrl = code => document.body.dispatchEvent(new KeyboardEvent('keydown', {key: code, code: code.length === 1 ? `Key${code.toUpperCase()}` : code, ctrlKey: true, bubbles: true, cancelable: true}))
  assert('the line sticks to the bottom of the screen', getComputedStyle(bar).position === 'sticky' && getComputedStyle(bar).bottom === '11px')
  const b = bar.getBoundingClientRect()
  assert('… while the view is longer than the screen', Math.round(b.bottom) === window.innerHeight - 11)
  const button = $('#f2 > button')
  assert('a round button of 55 px, its icon of 33 px, named by its title', button.offsetHeight === 55 && $('#f2 rc-icon').getAttribute('size') === '33' &&
    button.getAttribute('aria-label') === 'New' && getComputedStyle(button).borderRadius !== '0px')
  // within 1 px: the browser may place the edges on fractions of a pixel (zoom, scale of the screen)
  const right = $('rc-floating-group[side="right"]').getBoundingClientRect().right
  const fits = b.width >= 400 // narrower, the buttons overflow the line: nothing to check
  assert(`side="right": the group is on the right${fits ? '' : ' (window too narrow, not checked)'}` +
    (!fits || Math.abs(right - b.right) <= 1 ? '' : ` (group ${right}, line ${b.right})`), !fits || Math.abs(right - b.right) <= 1)
  assert('gradient="right": ranks 0, 1, 2 from the left', rank('f2') === '0' && rank('f3') === '1' && rank('f4') === '2' && rank('f1') === '0')
  assert('… each button darker', getComputedStyle(button).backgroundColor !== getComputedStyle($('#f4 > button')).backgroundColor)
  got.length = 0
  ctrl('d')
  ctrl('ArrowLeft')
  assert('the keys of the buttons click them', got.map(p => p.from).join() === 'dup,left')
  $('#f3').hidden = true
  await tick()
  got.length = 0
  ctrl('d')
  assert('a hidden button: out of the gradient, no key', rank('f4') === '1' && got.length === 0 && getComputedStyle($('#f3')).display === 'none')
  $('#f4').setAttribute('disabled', '')
  await tick()
  ctrl('m')
  assert('a disabled button: no key', got.length === 0)
  keyboard.openLayer(bar, [])
  assert('hidden while a window is open', getComputedStyle(bar).visibility === 'hidden')
  keyboard.closeLayer(bar)
  assert('… shown again', getComputedStyle(bar).visibility === 'visible')
  sandbox.innerHTML = ''
  await tick()
  ctrl('ArrowLeft')
  assert('removed: the keys are forgotten', got.length === 0)
  bus.off('ovAction', onEvent)
  bus.off('overlayChanged', onOverlay)
})

await describe('rc-floating: sizes', async () => {
  sandbox.innerHTML = `
    <rc-floating-bar id="sbar" size="24">
      <rc-floating-group id="sg1"><rc-floating-button id="s1" icon="add"></rc-floating-button>
        <rc-floating-button id="s2" icon="pen"></rc-floating-button></rc-floating-group>
      <rc-floating-group id="sg2" side="right" size="30"><rc-floating-button id="s3" icon="copy"></rc-floating-button>
        <rc-floating-button id="s4" icon="trash" size="12"></rc-floating-button></rc-floating-group>
    </rc-floating-bar>`
  WComponent.render(sandbox)
  await tick()
  const icon = id => $(`#${id} rc-icon`).getAttribute('size')
  const height = id => $(`#${id} > button`).offsetHeight
  const gap = id => getComputedStyle($(`#${id}`)).columnGap
  assert('size of the bar: icons of 24 px, buttons of 40 px', icon('s1') === '24' && height('s1') === 40 && height('s2') === 40)
  assert('… space between buttons 16 px, margin 8 px', gap('sg1') === '16px' && getComputedStyle($('#sbar')).bottom === '8px' &&
    gap('sbar') === '16px')
  assert('size of a group wins over the bar', icon('s3') === '30' && height('s3') === 50 && gap('sg2') === '20px')
  assert('size of a button wins over its group', icon('s4') === '12' && height('s4') === 20)
  $('#sbar').setAttribute('size', '33')
  await tick()
  assert('the bar changes size: its buttons follow', icon('s1') === '33' && height('s1') === 55 && gap('sg1') === '22px')
  assert('… not those with a size of their own or of their group', icon('s3') === '30' && icon('s4') === '12')
  $('#sg2').removeAttribute('size')
  await tick()
  assert('the group loses its size: the size of the bar', icon('s3') === '33' && height('s3') === 55)
  $('#s4').removeAttribute('size')
  await tick()
  assert('the button loses its size: the size of the bar', icon('s4') === '33' && height('s4') === 55)
  sandbox.innerHTML = '<rc-floating-bar><rc-floating-group><rc-floating-button id="s5" icon="add"></rc-floating-button></rc-floating-group></rc-floating-bar>'
  WComponent.render(sandbox)
  await tick()
  assert('no size: 33 and 55, as before', icon('s5') === '33' && height('s5') === 55)
  sandbox.innerHTML = ''
  await tick()
})
