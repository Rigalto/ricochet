// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-ui.mjs — open tests/browser/index.html in a browser
// Actions declared in HTML (delegation), rc-icon and rc-icon-button.

import {describe, assert, captureConsole, releaseConsole} from '../kernel.mjs'
import {WComponent} from '../../src/core/w-component.mjs'
import {bus} from '../../src/core/bus.mjs'
import {config} from '../../src/core/config.mjs'
import {MemoryAdapter} from '../../src/adapters/memory.mjs'
import {iconset} from '../../src/icons/iconset.mjs'
import '../../src/ui/rc-icon-button.mjs'

const sandbox = document.getElementById('sandbox')
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const $ = selector => sandbox.querySelector(selector)
const got = []
const onEvent = payload => got.push(payload)
bus.on('tuAction', onEvent)
bus.on('tuOther', onEvent)

class Legacy extends WComponent { attach () {} }
WComponent.define('tu-legacy', Legacy)
class Changing extends WComponent {
  static clickActions = false
  attach () {}
}
WComponent.define('tu-changing', Changing)
class Notified extends WComponent {
  attach () { this.notified = [] }
  notify (e, dataset) { this.notified.push(dataset.event) }
}
WComponent.define('tu-notified', Notified)

await describe('Actions — delegation of data-* clicks', async () => {
  config.setAdapter(new MemoryAdapter({}))
  await config.load()
  sandbox.innerHTML = `
    <div data-event="tuOther"><span id="nested" data-event="tuAction" data-param='{"a": 1}' data-value="v"><b id="inner">x</b></span></div>
    <span id="item" data-item="tu-item" data-value="42"></span>
    <span id="both" data-event="tuAction, tuOther" data-param='{"b": 2}'></span>
    <span id="off" disabled data-event="tuAction"></span>
    <div aria-disabled="true"><span id="off2" data-event="tuAction"></span></div>
    <div as="tu-legacy"><span id="legacy" data-event="tuAction"></span></div>
    <span as="tu-legacy" id="legacy2" data-event="tuAction"></span>
    <tu-changing id="changing" data-event="tuAction"></tu-changing>
    <tu-notified id="notified" data-event="tuAction"></tu-notified>
    <span id="bad" data-event="tuAction" data-param="{oops"></span>`
  WComponent.render(sandbox)
  got.length = 0
  $('#inner').click()
  assert('the nearest element runs, not the one above', got.length === 1 && got[0].a === 1 && got[0].value === 'v')
  $('#item').click()
  assert('data-item sets the item', config.get('tu-item') === '42')
  got.length = 0
  $('#both').click()
  assert('several events, each with its own payload', got.length === 2 && got[0].b === 2 && got[0] !== got[1])
  got.length = 0
  $('#off').click()
  $('#off2').click()
  assert('disabled or aria-disabled: nothing runs', got.length === 0)
  $('#legacy').click()
  $('#legacy2').click()
  assert('former syntax (as=): left to its own handlers', got.length === 0)
  $('#changing').click()
  assert('static clickActions = false: no click action', got.length === 0)
  $('#notified').click()
  assert('notify(event, dataset) after the actions', got.length === 1 && $('#notified')._component.notified[0] === 'tuAction')
  got.length = 0
  captureConsole()
  $('#bad').click()
  const lines = releaseConsole()
  assert('invalid data-param: reported, nothing emitted', got.length === 0 && lines.some(l => l.includes('not valid JSON')))
  sandbox.innerHTML = ''
  await tick()
})

await describe('Actions — a former handler stops the click first', async () => {
  class Former extends WComponent {
    attach () {
      this.innerHTML('<span id="f" data-event="tuAction"></span>')
      this.element.addEventListener('click', this.clickDatasetHandler)
    }
  }
  WComponent.define('tu-former', Former)
  sandbox.innerHTML = '<tu-former></tu-former>'
  got.length = 0
  $('#f').click()
  assert('the action runs once', got.length === 1)
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-icon', async () => {
  sandbox.innerHTML = '<rc-icon id="i" icon="save"></rc-icon><rc-icon id="j" icon="trash" size="32" label="Deleted"></rc-icon>'
  const i = $('#i')
  const path = () => i.querySelector('path').getAttribute('d')
  assert('the path of the icon', path() === iconset.save)
  assert('24 px by default', i.querySelector('svg').style.width === '24px')
  assert('decorative without label', i.getAttribute('aria-hidden') === 'true')
  assert('an image with a label', $('#j').getAttribute('role') === 'img' && $('#j').getAttribute('aria-label') === 'Deleted')
  assert('size', $('#j').querySelector('svg').style.height === '32px')
  i.setAttribute('icon', 'trash')
  assert('a change of icon', path() === iconset.trash)
  captureConsole()
  i.setAttribute('icon', 'tu-unknown')
  i.setAttribute('icon', 'save')
  i.setAttribute('icon', 'tu-unknown')
  const lines = releaseConsole()
  assert('an unknown icon draws add, reported once', path() === iconset.add && lines.filter(l => l.includes("'tu-unknown'")).length === 1)
  assert('the colour of the text', getComputedStyle(i.querySelector('svg')).fill === getComputedStyle(i).color)
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-icon-button', async () => {
  sandbox.innerHTML = `
    <rc-icon-button id="a" icon="save" data-event="tuAction" data-param='{"n": 1}'>Save</rc-icon-button>
    <rc-icon-button id="b" icon="trash" title="Delete" data-event="tuAction"></rc-icon-button>`
  const a = $('#a')
  const button = a.querySelector('button')
  assert('a real button with the icon and the label', button.type === 'button' && a.querySelector('rc-icon').getAttribute('icon') === 'save' &&
    button.textContent.trim() === 'Save')
  assert('without label, the title names the button', $('#b button').getAttribute('aria-label') === 'Delete')
  a.setAttribute('label', 'Store')
  assert('label replaces the text', button.textContent.trim() === 'Store' && !button.hasAttribute('aria-label'))
  a.removeAttribute('label')
  assert('back to the text', button.textContent.trim() === 'Save')
  got.length = 0
  button.click()
  assert('a click runs the actions of the element', got.length === 1 && got[0].n === 1)
  a.setAttribute('disabled', '')
  assert('disabled: the button too', button.disabled)
  button.click()
  a.click()
  assert('disabled: no action', got.length === 1)
  a.removeAttribute('disabled')
  button.click()
  assert('enabled again', got.length === 2 && !button.disabled)
  a.setAttribute('icon', 'pen')
  assert('a change of icon', a.querySelector('rc-icon').getAttribute('icon') === 'pen')
  assert('it stands on the surface of its block', getComputedStyle(button).backgroundColor !== getComputedStyle(sandbox).backgroundColor)
  sandbox.innerHTML = ''
  await tick()
  bus.off('tuAction', onEvent)
  bus.off('tuOther', onEvent)
})
