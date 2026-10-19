// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-ui.mjs — open tests/browser/index.html in a browser
// Actions declared in HTML (delegation), rc-icon, rc-icon-button, rc-text-button, rc-checkbox, rc-radio, rc-input and rc-textarea.

import {describe, assert, captureConsole, releaseConsole} from '../kernel.mjs'
import {WComponent} from '../../src/core/w-component.mjs'
import {bus} from '../../src/core/bus.mjs'
import {config} from '../../src/core/config.mjs'
import {MemoryAdapter} from '../../src/adapters/memory.mjs'
import {iconset} from '../../src/icons/iconset.mjs'
import '../../src/ui/rc-icon-button.mjs'
import '../../src/ui/rc-text-button.mjs'
import '../../src/ui/rc-checkbox.mjs'
import '../../src/ui/rc-radio.mjs'
import {RcInput, defineChecks} from '../../src/ui/rc-input.mjs'
import {RcTextarea} from '../../src/ui/rc-textarea.mjs'

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
})

await describe('rc-text-button', async () => {
  sandbox.innerHTML = `
    <rc-text-button id="a" data-event="tuAction" data-param='{"n": 1}'>Start <rc-icon icon="save"></rc-icon></rc-text-button>
    <rc-text-button id="b" flat>Flat</rc-text-button>
    <rc-text-button id="c" link>Link</rc-text-button>
    <rc-text-button id="d" shade="deep">Deep</rc-text-button>`
  await tick()
  const a = $('#a')
  const button = a.querySelector('button')
  assert('the content moves into a real button, components included', button.type === 'button' && button.textContent.trim() === 'Start' &&
    button.querySelector('rc-icon')?._component !== undefined && a.children.length === 1)
  got.length = 0
  button.click()
  assert('a click runs the actions', got.length === 1 && got[0].n === 1)
  a.setAttribute('label', 'Go')
  assert('label replaces the content', button.textContent === 'Go')
  a.removeAttribute('label')
  assert('back to the content', button.textContent.trim() === 'Start' && button.querySelector('rc-icon') !== null)
  a.setAttribute('disabled', '')
  button.click()
  assert('disabled: no action', button.disabled && got.length === 1)
  const bg = id => getComputedStyle($(`#${id} > button`)).backgroundColor
  assert('the default look stands on the block', bg('a') !== getComputedStyle(sandbox).backgroundColor)
  assert('flat and link: no background', bg('b') === 'rgba(0, 0, 0, 0)' && bg('c') === 'rgba(0, 0, 0, 0)')
  assert('link: the colour of links, underlined', getComputedStyle($('#c > button')).textDecorationLine === 'underline')
  assert('a shade: the surface of the shade, not around the button', bg('d') !== bg('a') &&
    getComputedStyle($('#d')).backgroundColor === 'rgba(0, 0, 0, 0)')
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-checkbox', async () => {
  config.setItem('tu-box', 'yes')
  sandbox.innerHTML = `
    <rc-checkbox id="c">Grid</rc-checkbox>
    <rc-checkbox id="d" checked data-event="tuAction" data-param='{"layer": "roads"}'></rc-checkbox>
    <rc-checkbox id="e" data-item="tu-box"></rc-checkbox>
    <rc-checkbox id="f" data-item="tu-unset" checked></rc-checkbox>`
  await tick()
  const c = $('#c')
  const button = c.querySelector('button')
  const icon = el => el.querySelector('rc-icon').getAttribute('icon')
  assert('unchecked by default', c._component.value === 'no' && icon(c) === 'square' && button.getAttribute('aria-checked') === 'false')
  assert('a checkbox for screen readers, with its label', button.getAttribute('role') === 'checkbox' && button.textContent.trim() === 'Grid')
  assert('the checked attribute gives the initial state', $('#d')._component.value === 'yes' && icon($('#d')) === 'checksquare')
  button.click()
  assert('a click checks the box', c._component.value === 'yes' && c.hasAttribute('checked') && icon(c) === 'checksquare' &&
    button.getAttribute('aria-checked') === 'true' && c.dataset.value === 'yes')
  button.click()
  assert('a second click unchecks it', c._component.value === 'no' && !c.hasAttribute('checked'))
  c._component.value = 'yes'
  assert('the value property', c.hasAttribute('checked') && icon(c) === 'checksquare')
  c.removeAttribute('checked')
  assert('the checked attribute', c._component.value === 'no' && icon(c) === 'square')
  got.length = 0
  $('#d button').click()
  assert('data-event: the payload gets the new value', got.length === 1 && got[0].layer === 'roads' && got[0].value === 'no')
  got.length = 0
  $('#d')._component.value = 'yes'
  assert('a change by value runs no action', got.length === 0)
  const e = $('#e')
  assert('data-item: the box shows the item', e._component.value === 'yes')
  e.querySelector('button').click()
  assert('a click sets the item', config.get('tu-box') === 'no' && e._component.value === 'no')
  config.setItem('tu-box', 'yes')
  await tick()
  assert('the box follows the item', e._component.value === 'yes')
  assert('an item not set leaves the initial state', $('#f')._component.value === 'yes')
  $('#d').setAttribute('disabled', '')
  $('#d button').click()
  $('#d').click()
  assert('disabled: neither the state nor the actions change', $('#d')._component.value === 'yes' && got.length === 0)
  assert('no background', getComputedStyle(button).backgroundColor === 'rgba(0, 0, 0, 0)')
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-radio and rc-radio-group', async () => {
  config.setItem('tu-radio', 'b')
  sandbox.innerHTML = `
    <rc-radio-group id="g" value="a" data-event="tuAction" data-param='{"group": "g"}'>
      <rc-radio value="a">A</rc-radio><rc-radio value="b">B</rc-radio><rc-radio value="c" disabled>C</rc-radio><rc-radio value="d">D</rc-radio>
    </rc-radio-group>
    <rc-radio-group id="h" data-item="tu-radio"><rc-radio value="a">A</rc-radio><rc-radio value="b">B</rc-radio></rc-radio-group>
    <rc-radio-group id="k" data-item="tu-radio-unset" value="y"><rc-radio>x</rc-radio><rc-radio>y</rc-radio></rc-radio-group>
    <rc-radio-group id="off" disabled value="a"><rc-radio value="a">A</rc-radio><rc-radio value="b">B</rc-radio></rc-radio-group>`
  await tick()
  const g = $('#g')
  const radios = [...g.querySelectorAll('rc-radio')]
  const checked = group => [...group.querySelectorAll('rc-radio[checked]')].map(r => r.getAttribute('value')).join()
  const icon = radio => radio.querySelector('rc-icon').getAttribute('icon')
  assert('a radio group for screen readers', g.getAttribute('role') === 'radiogroup' && radios[0].querySelector('button').getAttribute('role') === 'radio')
  assert('the value attribute checks its radio', checked(g) === 'a' && icon(radios[0]) === 'radioon' && icon(radios[1]) === 'radiooff' &&
    radios[0].querySelector('button').getAttribute('aria-checked') === 'true')
  got.length = 0
  radios[1].querySelector('button').click()
  assert('a click selects the radio', g.getAttribute('value') === 'b' && checked(g) === 'b' && g.dataset.value === 'b')
  assert('the actions of the group get the new value', got.length === 1 && got[0].group === 'g' && got[0].value === 'b')
  radios[1].querySelector('button').click()
  assert('a click on the checked radio runs nothing', got.length === 1)
  radios[2].querySelector('button').click()
  assert('a disabled radio cannot be selected', g.getAttribute('value') === 'b' && got.length === 1)
  g.setAttribute('value', 'd')
  assert('the value attribute changes the selection, with no action', checked(g) === 'd' && got.length === 1)
  g._component.value = 'a'
  assert('the value property', checked(g) === 'a' && g._component.value === 'a')
  radios[0].querySelector('button').dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowRight', key: 'ArrowRight', bubbles: true, cancelable: true}))
  assert('an arrow selects the next radio', checked(g) === 'b' && document.activeElement === radios[1].querySelector('button') && got.length === 2)
  radios[1].querySelector('button').dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowRight', key: 'ArrowRight', bubbles: true, cancelable: true}))
  assert('the arrows skip the disabled radios', checked(g) === 'd')
  radios[3].querySelector('button').dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowDown', key: 'ArrowDown', bubbles: true, cancelable: true}))
  assert('and go round', checked(g) === 'a')
  radios[0].querySelector('button').dispatchEvent(new KeyboardEvent('keydown', {code: 'ArrowUp', key: 'ArrowUp', bubbles: true, cancelable: true}))
  assert('up: the previous one', checked(g) === 'd')
  const h = $('#h')
  assert('data-item: the radios show the item', checked(h) === 'b')
  h.querySelector('rc-radio button').click()
  assert('a click sets the item', config.get('tu-radio') === 'a' && checked(h) === 'a')
  config.setItem('tu-radio', 'b')
  await tick()
  assert('the radios follow the item', checked(h) === 'b')
  assert('an item not set leaves the initial value; value defaults to the label', checked($('#k')) === 'y')
  h.insertAdjacentHTML('beforeend', '<rc-radio value="b">B again</rc-radio>')
  assert('a radio added later follows the group', h.querySelectorAll('rc-radio[checked]').length === 2)
  got.length = 0
  const off = $('#off')
  off.querySelectorAll('rc-radio button')[1].click()
  assert('a disabled group: nothing changes', off.getAttribute('value') === 'a' && off.getAttribute('aria-disabled') === 'true')
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-input', async () => {
  defineChecks({
    tuEven: value => Number(value) % 2 === 0,
    tuHex: /^[0-9a-f]+$/g,
    tuNotIn: {test: (value, element) => !(element.getAttribute('exclude') ?? '').split('|').includes(value), attributes: ['exclude']}
  })
  class TuShortcut extends RcInput {
    transform (value) { return value === '-' ? '2026' : value }
    validate (value) { return super.validate(value) && value !== '1999' }
  }
  WComponent.define('tu-shortcut', TuShortcut)
  config.setItem('tu-input', 'hello')
  sandbox.innerHTML = `
    <rc-input id="a" value="12" required min="10" max="20" placeholder="10 to 20" data-event="tuAction" data-param='{"f": "a"}'></rc-input>
    <rc-input id="b" data-item="tu-input"></rc-input>
    <rc-input id="c" commit="change" data-event="tuAction"></rc-input>
    <rc-input id="d" commit="enter" data-event="tuAction"></rc-input>
    <rc-input id="e" pattern="[a-z]+" check="tuEven"></rc-input>
    <rc-input id="f" check="tuHex tuNotIn" exclude="ab|cd"></rc-input>
    <rc-input id="g" check="tuUnknown"></rc-input>
    <tu-shortcut id="h"></tu-shortcut>
    <rc-input id="i" disabled label="Name" type="number"></rc-input>`
  await tick()
  const field = id => $(`#${id}`)
  const input = id => $(`#${id} > input`)
  const type = (id, text) => {
    input(id).value = text
    input(id).dispatchEvent(new Event('input', {bubbles: true}))
  }
  const key = (id, k) => input(id).dispatchEvent(new KeyboardEvent('keydown', {key: k, code: k, bubbles: true, cancelable: true}))
  const leave = id => input(id).dispatchEvent(new Event('change', {bubbles: true}))
  assert('a real input, with the attributes passed on', input('a').tagName === 'INPUT' && input('a').placeholder === '10 to 20' &&
    input('i').disabled && input('i').getAttribute('aria-label') === 'Name' && input('i').type === 'number')
  assert('the value attribute gives the initial value', input('a').value === '12' && field('a')._component.value === '12' && field('a')._component.valid)
  got.length = 0
  type('a', '15')
  assert('a valid keystroke runs the actions with the value', got.length === 1 && got[0].f === 'a' && got[0].value === '15')
  type('a', '25')
  assert('above max: invalid, no action', got.length === 1 && field('a').hasAttribute('invalid') &&
    input('a').getAttribute('aria-invalid') === 'true' && field('a')._component.value === null)
  type('a', 'x')
  assert('min and max: a number is expected', field('a').hasAttribute('invalid'))
  type('a', '')
  assert('required: empty is invalid', field('a').hasAttribute('invalid'))
  field('a').setAttribute('value', '11')
  assert('a new value attribute: shown, checked, no action', input('a').value === '11' && !field('a').hasAttribute('invalid') && got.length === 1)
  field('a').setAttribute('max', '10')
  assert('a rule that changes: checked again', field('a').hasAttribute('invalid'))
  field('a')._component.value = '10'
  assert('the value property', input('a').value === '10' && field('a')._component.valid && got.length === 1)
  assert('a click runs nothing', (input('a').click(), got.length === 1))
  assert('data-item: the field shows the item', input('b').value === 'hello')
  type('b', 'world')
  assert('a keystroke sets the item', config.get('tu-input') === 'world')
  config.setItem('tu-input', 'again')
  await tick()
  assert('the field follows the item', input('b').value === 'again')
  got.length = 0
  type('c', 'one')
  assert('commit=change: nothing at the keystroke', got.length === 0)
  leave('c')
  assert('… the actions run when the field is left', got.length === 1 && got[0].value === 'one')
  key('c', 'Enter')
  leave('c')
  assert('… once for the same value', got.length === 1)
  type('c', 'two')
  key('c', 'Enter')
  assert('… or on Enter', got.length === 2 && got[1].value === 'two')
  got.length = 0
  type('d', 'term')
  assert('commit=enter: nothing at the keystroke', got.length === 0)
  key('d', 'Enter')
  key('d', 'Enter')
  assert('… the actions run on each Enter', got.length === 2 && got[0].value === 'term')
  type('e', 'ab')
  assert('pattern + named check (even): a string is not even', field('e').hasAttribute('invalid'))
  field('e').removeAttribute('check')
  assert('pattern alone', !field('e').hasAttribute('invalid'))
  type('e', 'ab1')
  assert('the pattern matches the whole value', field('e').hasAttribute('invalid'))
  type('f', 'ff')
  type('f', 'ff')
  assert('a regular expression with the g flag gives the same answer twice', !field('f').hasAttribute('invalid'))
  type('f', 'ab')
  assert('a check reading an attribute', field('f').hasAttribute('invalid'))
  field('f').setAttribute('exclude', 'cd')
  await tick()
  assert('… checked again when the attribute changes', !field('f').hasAttribute('invalid'))
  captureConsole()
  type('g', 'x')
  type('g', 'y')
  const lines = releaseConsole()
  assert('an unknown check: reported once, ignored', !field('g').hasAttribute('invalid') && lines.filter(l => l.includes('tuUnknown')).length === 1)
  type('h', '-')
  assert('a subclass: transform', input('h').value === '2026' && field('h')._component.valid)
  type('h', '1999')
  assert('a subclass: validate', field('h').hasAttribute('invalid'))
  assert('the field stands on the surface of its block', getComputedStyle(input('a')).backgroundColor !== getComputedStyle(sandbox).backgroundColor)
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-textarea', async () => {
  const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const lines = n => Array.from({length: n}, (_, i) => `line ${i + 1}`).join('\n')
  const native = RcTextarea.fieldSizing
  config.setItem('tu-text', 'from the item')
  sandbox.innerHTML = `
    <rc-textarea id="a" style="width: 20em" data-event="tuAction" data-param='{"t": "a"}' placeholder="Text"></rc-textarea>
    <rc-textarea id="b" style="width: 20em" rows="3" max-rows="5" commit="enter" data-event="tuAction"></rc-textarea>
    <rc-textarea id="c" data-item="tu-text" required></rc-textarea>`
  await tick()
  const field = id => $(`#${id} > textarea`)
  const type = (id, text) => {
    field(id).value = text
    field(id).dispatchEvent(new Event('input', {bubbles: true}))
  }
  const key = (id, init) => field(id).dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, ...init}))
  assert('a real textarea, with the look of the fields', field('a').tagName === 'TEXTAREA' && field('a').placeholder === 'Text' &&
    getComputedStyle(field('a')).resize === 'none')
  got.length = 0
  type('a', 'one\ntwo')
  assert('a keystroke runs the actions with the value', got.length === 1 && got[0].t === 'a' && got[0].value === 'one\ntwo')
  assert('data-item: the field shows the item', field('c').value === 'from the item')
  type('c', '')
  assert('required, as rc-input', $('#c').hasAttribute('invalid'))
  got.length = 0
  type('b', 'term')
  key('b')
  assert('commit=enter: Enter alone starts a line, no action', got.length === 0)
  key('b', {ctrlKey: true})
  key('b', {metaKey: true})
  assert('… Ctrl + Enter or ⌘ + Enter commit', got.length === 2 && got[0].value === 'term')
  const growth = async (label, id) => {
    type(id, '')
    await frame()
    const empty = field(id).offsetHeight
    type(id, lines(4))
    await frame()
    const four = field(id).offsetHeight
    type(id, lines(20))
    await frame()
    const twenty = field(id).offsetHeight
    const scrolls = field(id).scrollHeight > field(id).clientHeight
    type(id, 'x')
    await frame()
    const back = field(id).offsetHeight
    return {empty, four, twenty, back, scrolls}
  }
  let h = await growth('native', 'b')
  assert(`the height follows the text (${native ? 'field-sizing' : 'measured'}): 3 to 5 lines`, h.empty > 0 && h.four > h.empty && h.twenty > h.four && h.back === h.empty)
  assert('beyond max-rows, the field scrolls', h.scrolls)
  // the measured height, as in a browser without field-sizing
  RcTextarea.fieldSizing = false
  sandbox.insertAdjacentHTML('beforeend', `<rc-textarea id="m" style="width: 20em" rows="3" max-rows="5"></rc-textarea>
    <div id="hidden" style="display: none"><rc-textarea id="n" style="width: 20em" value="${lines(4)}"></rc-textarea></div>`)
  RcTextarea.fieldSizing = native
  await frame()
  h = await growth('measured', 'm')
  assert('measured: the same heights', h.empty > 0 && h.four > h.empty && h.twenty > h.four && h.back === h.empty)
  const b = await growth('native', 'b')
  assert('measured and native: the same sizes', Math.abs(b.empty - h.empty) <= 1 && Math.abs(b.four - h.four) <= 1 && Math.abs(b.twenty - h.twenty) <= 1)
  $('#hidden').style.display = 'block'
  await frame()
  await frame()
  assert('measured: a field shown later gets its height', field('n').offsetHeight >= field('n').scrollHeight && field('n').offsetHeight > b.empty)
  sandbox.innerHTML = ''
  await tick()
  bus.off('tuAction', onEvent)
  bus.off('tuOther', onEvent)
})
