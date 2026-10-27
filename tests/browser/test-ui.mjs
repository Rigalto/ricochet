// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-ui.mjs — open tests/browser/index.html in a browser
// Actions declared in HTML (delegation), rc-icon, rc-icon-button, rc-text-button, rc-checkbox, rc-radio, rc-input, rc-textarea, rc-select, rc-tabs, rc-slider and rc-breadcrumb.

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
import {defineOptionSources, parseOptions} from '../../src/ui/rc-select.mjs'
import '../../src/ui/rc-tabs.mjs'
import '../../src/ui/rc-slider.mjs'
import '../../src/ui/rc-breadcrumb.mjs'

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

await describe('Actions — click and double click', async () => {
  const opened = []
  const onOpen = payload => opened.push(payload)
  bus.on('tuOpen', onOpen)
  sandbox.innerHTML = `
    <table><tbody>
      <tr id="row" data-event="tuAction" data-dblclick="tuOpen" data-param='{"selected": "123"}'>
        <td id="cell">Row</td><td><span id="inside" data-event="tuOther">x</span></td>
      </tr>
      <tr id="only" data-dblclick="tuOpen, tuOther" data-param='{"selected": "7"}'><td id="cell2">Only</td></tr>
      <tr id="offrow" disabled data-event="tuAction" data-dblclick="tuOpen"><td id="cell3">Off</td></tr>
    </tbody></table>
    <span id="plain" data-event="tuAction"></span>`
  WComponent.render(sandbox)
  const mouse = (target, type, detail) => target.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true, detail}))
  const double = target => {
    mouse(target, 'click', 1)
    mouse(target, 'click', 2)
    mouse(target, 'dblclick', 2)
  }
  got.length = 0
  mouse($('#cell'), 'click', 1)
  assert('a click: the actions of the click, at once', got.length === 1 && got[0].selected === '123' && opened.length === 0)
  got.length = 0
  double($('#cell'))
  assert('a double click: the click once, then the double click', got.length === 1 && opened.length === 1 &&
    opened[0].selected === '123')
  assert('each event its own payload', got[0] !== opened[0])
  got.length = 0
  opened.length = 0
  mouse($('#cell'), 'click', 0)
  assert('a click from the keyboard (detail 0) runs', got.length === 1)
  got.length = 0
  double($('#inside'))
  assert('a double click on an element with its own actions does not open the row', opened.length === 0 && got.length === 2)
  got.length = 0
  double($('#cell2'))
  assert('data-dblclick alone: several events', opened.length === 1 && got.length === 1 && got[0].selected === '7')
  got.length = 0
  opened.length = 0
  double($('#cell3'))
  assert('disabled: nothing runs', got.length === 0 && opened.length === 0)
  double($('#plain'))
  assert('without data-dblclick: the second click runs too', got.length === 2 && opened.length === 0)
  bus.off('tuOpen', onOpen)
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

await describe('rc-breadcrumb', async () => {
  const frames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  const errors = window.$global.errors.error
  sandbox.innerHTML = `
    <div id="box" style="width: 700px">
      <rc-breadcrumb id="bc">
        <rc-crumb id="c1" icon="home" label="Home of the family" data-event="tuAction" data-param='{"step": 1}'></rc-crumb>
        <rc-crumb id="c2" icon="save" prefix="1.2" label="A rather long chapter title" data-event="tuAction" data-param='{"step": 2}'></rc-crumb>
        <span id="other">other</span>
        <rc-crumb id="c3" prefix="[12]" label="The place where the user is"></rc-crumb>
      </rc-breadcrumb>
    </div>`
  WComponent.render(sandbox)
  await frames()
  const bc = $('#bc')
  const collapsed = () => [...bc.querySelectorAll('rc-crumb[collapsed]')].map(crumb => crumb.id).join(',')
  const sep = id => getComputedStyle($(`#${id}`), '::before').content
  assert('one line, a navigation named Breadcrumb', getComputedStyle(bc).display === 'flex' &&
    bc.getAttribute('role') === 'navigation' && bc.getAttribute('aria-label') === 'Breadcrumb')
  assert('a separator before each step but the first, any element included', sep('c1') === 'none' &&
    sep('c2').includes('›') && sep('other').includes('›') && sep('c3').includes('›'))
  assert('a crumb with actions is a flat button; without, a text', $('#c1 > rc-text-button[flat] > button') !== null &&
    $('#c3 > .rc-crumb-text') !== null && $('#c3 button') === null)
  assert('icon, prefix, label; no icon element without icon', $('#c2 rc-icon').getAttribute('icon') === 'save' &&
    $('#c2 .rc-crumb-prefix').textContent === '1.2' && $('#c3 rc-icon') === null && $('#c1 .rc-crumb-prefix').hidden)
  assert('the last step is the current page', $('#c3').getAttribute('aria-current') === 'page' && !$('#c2').hasAttribute('aria-current'))
  assert('wide enough: every label shown', collapsed() === '')
  got.length = 0
  $('#c2 button').click()
  assert('a click runs the actions of the crumb', got.length === 1 && got[0].step === 2)
  // a click on a separator runs nothing: it belongs to the line, not to the crumb after it
  const r = $('#c2').getBoundingClientRect()
  const hit = document.elementFromPoint(r.left + 3, r.top + r.height / 2)
  assert('the separator is not part of the button', hit !== null && !$('#c2').contains(hit))
  $('#box').style.width = '420px'
  await frames()
  assert('shorter: the first labels are hidden first', collapsed() === 'c1' || collapsed() === 'c1,c2')
  assert('the line fits', bc.scrollWidth <= bc.clientWidth + 1)
  assert('a hidden label becomes the tooltip and the name of the button', $('#c1 > rc-text-button').title === 'Home of the family' &&
    $('#c1 button').getAttribute('aria-label') === 'Home of the family')
  $('#box').style.width = '160px'
  await frames()
  assert('very short: every label hidden but the last one, cut', collapsed() === 'c1,c2' && !$('#c3').hasAttribute('collapsed') &&
    getComputedStyle($('#c3 .rc-crumb-label')).textOverflow === 'ellipsis')
  assert('the prefix has the colour of the label', getComputedStyle($('#c2 .rc-crumb-prefix')).color ===
    getComputedStyle($('#c2 .rc-crumb-label')).color)
  assert('the prefix stays', getComputedStyle($('#c2 .rc-crumb-prefix')).display !== 'none' &&
    getComputedStyle($('#c2 .rc-crumb-label')).display === 'none')
  $('#box').style.width = '700px'
  await frames()
  assert('wider again: the labels come back, the tooltip goes', collapsed() === '' && !$('#c1 > rc-text-button').hasAttribute('title'))
  $('#c1').setAttribute('keep', '')
  $('#box').style.width = '420px'
  await frames()
  assert('keep: that label is never hidden', !$('#c1').hasAttribute('collapsed') && $('#c2').hasAttribute('collapsed'))
  $('#c1').removeAttribute('keep')
  $('#box').style.width = '700px'
  await frames()
  // a crumb with a label only: nothing would be left of it, its label stays
  $('#c1').removeAttribute('icon')
  $('#box').style.width = '420px'
  await frames()
  assert('without icon nor prefix: the label is never hidden', !$('#c1').hasAttribute('collapsed') && $('#c2').hasAttribute('collapsed'))
  $('#c1').setAttribute('icon', 'home')
  $('#box').style.width = '700px'
  await frames()
  $('#c3').setAttribute('label', 'A much longer place, where the user stands now, with many words in it')
  await frames()
  assert('a label that changes fits the line again', collapsed() !== '')
  $('#c2').setAttribute('title', 'Chapter')
  assert('a title of its own wins', $('#c2 > rc-text-button').title === 'Chapter')
  bc.setAttribute('separator', '/')
  assert('separator attribute', sep('c2').includes('/'))
  const crumb = document.createElement('rc-crumb')
  crumb.setAttribute('label', 'Added')
  bc.append(crumb)
  await frames()
  assert('a crumb added becomes the current page', crumb.getAttribute('aria-current') === 'page' && !$('#c3').hasAttribute('aria-current'))
  assert('no error (no loop of the resize observer)', window.$global.errors.error === errors)
  sandbox.innerHTML = ''
  await tick()
})

await describe('Hover only where the pointer can hover', async () => {
  // on a touch screen, the browser keeps a hover where the finger touched: the hover looks of Ricochet are in
  // @media (hover: hover); the rules that cancel a hover (a checked radio, a disabled group, an invalid field) may stay out
  const found = []
  const walk = (rules, inLayer, inHover) => {
    for (const rule of rules) {
      if (rule instanceof CSSLayerBlockRule) {
        walk(rule.cssRules, inLayer || rule.name === 'ricochet', inHover)
      } else if (rule instanceof CSSMediaRule) {
        walk(rule.cssRules, inLayer, inHover || rule.conditionText.includes('(hover: hover)'))
      } else if (rule instanceof CSSStyleRule && inLayer && rule.selectorText.includes(':hover')) {
        found.push({selector: rule.selectorText, inHover})
      }
    }
  }
  for (const sheet of document.styleSheets) { walk(sheet.cssRules, false, false) }
  const cancelling = rule => /\[(checked|disabled|invalid)\]/.test(rule.selector)
  const outside = found.filter(rule => !rule.inHover && !cancelling(rule))
  assert('hover rules found in the ricochet layer', found.filter(rule => rule.inHover).length >= 6)
  assert(`every hover look is in @media (hover: hover)${outside.length === 0 ? '' : ': ' + outside.map(r => r.selector).join(' ; ')}`,
    outside.length === 0)
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
  radios[3].querySelector('button').dispatchEvent(new KeyboardEvent('keydown', {code: 'Home', key: 'Home', bubbles: true, cancelable: true}))
  assert('Home: the first one', checked(g) === 'a')
  radios[0].querySelector('button').dispatchEvent(new KeyboardEvent('keydown', {code: 'End', key: 'End', bubbles: true, cancelable: true}))
  assert('End: the last one', checked(g) === 'd')
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
  const enter = new KeyboardEvent('keydown', {key: 'Enter', code: 'Enter', bubbles: true, cancelable: true})
  input('d').dispatchEvent(enter)
  assert('… the Enter that commits is used: its default action is cancelled', enter.defaultPrevented && got.length === 3)
  const other = new KeyboardEvent('keydown', {key: 'a', code: 'KeyA', bubbles: true, cancelable: true})
  input('d').dispatchEvent(other)
  assert('… not the other keys', !other.defaultPrevented)
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
})

await describe('rc-select', async () => {
  const later = []
  let calls = 0
  defineOptionSources({
    tuLater: {
      options: sheet => new Promise(resolve => later.push(() => resolve([{label: `${sheet} 1`, value: '1'}, {label: `${sheet} 2`, value: '2', group: 'G'}, {label: `${sheet} 3`, value: '3', group: 'G'}]))),
      events: ['tuRefresh']
    },
    tuNow: argument => { calls += 1; return argument.split(',') }
  })
  assert('parseOptions: label, label#value', JSON.stringify(parseOptions('A|B#b')) === JSON.stringify([{label: 'A', value: 'A'}, {label: 'B', value: 'b'}]))
  config.setItem('tu-select', 'm')
  config.setItem('tu-list', 'Red#r|Green#g')
  sandbox.innerHTML = `
    <rc-select id="a" options="Small#s|Medium#m|Large#l" data-event="tuAction" data-param='{"s": "a"}'></rc-select>
    <rc-select id="b" data-item="tu-select" options="Small#s|Medium#m|Large#l"></rc-select>
    <rc-select id="c" none="None" value="rivers"><option value="roads">Roads</option><optgroup label="Water"><option value="rivers">Rivers</option><option value="lakes" disabled>Lakes</option></optgroup></rc-select>
    <rc-select id="d" source="tuLater Sheet" value="2" none="—"></rc-select>
    <rc-select id="e" source="item tu-list" value="g"></rc-select>
    <rc-select id="f" source="tuNow x,y,z" required none="" value=""></rc-select>
    <rc-select id="g" options="A|B" label="Letter" disabled></rc-select>`
  await tick()
  const select = id => $(`#${id} > select`)
  const choose = (id, value) => {
    select(id).value = value
    select(id).dispatchEvent(new Event('change', {bubbles: true}))
  }
  const labels = id => [...select(id).options].map(o => o.textContent).join()
  assert('a native select with the options of the attribute', labels('a') === 'Small,Medium,Large' && select('a').value === 's')
  got.length = 0
  choose('a', 'l')
  assert('a choice runs the actions with the value', got.length === 1 && got[0].s === 'a' && got[0].value === 'l' && $('#a').dataset.value === 'l')
  assert('data-item: the select shows the item', select('b').value === 'm')
  choose('b', 's')
  assert('a choice sets the item', config.get('tu-select') === 's')
  config.setItem('tu-select', 'l')
  await tick()
  assert('the select follows the item', select('b').value === 'l')
  assert('options and groups written in the HTML, the none option first', labels('c') === 'None,Roads,Rivers,Lakes' &&
    select('c').querySelector('optgroup')?.label === 'Water' && select('c').value === 'rivers' && select('c').options[3].disabled)
  $('#c').setAttribute('value', 'nothing')
  assert('a value not in the list: the none option', select('c').value === '' && $('#c')._component.value === '')
  $('#c')._component.value = 'roads'
  assert('the value property, no action', select('c').value === 'roads' && got.length === 1)
  assert('a source that answers later: only the none option for now', labels('d') === '—' && $('#d')._component.value === '')
  later.shift()()
  await tick()
  assert('… then its options, and the value given before', labels('d') === '—,Sheet 1,Sheet 2,Sheet 3' && select('d').value === '2' &&
    select('d').querySelector('optgroup').label === 'G')
  bus.emit('tuRefresh', {})
  assert('an event of the source asks again', later.length === 1)
  later.shift()()
  await tick()
  assert('… and the value stays', select('d').value === '2')
  $('#d').setAttribute('source', 'tuLater Other')
  $('#d').setAttribute('source', 'tuLater Third')
  later.shift()() // the answer to the first request comes after the second request: ignored
  await tick()
  assert('an answer to a former request is ignored', !labels('d').includes('Other'))
  later.shift()()
  await tick()
  assert('… the last one is shown', labels('d').includes('Third 1'))
  assert('the source item: options from a configuration item', labels('e') === 'Red,Green' && select('e').value === 'g')
  config.setItem('tu-list', 'Red#r|Green#g|Blue#b')
  await tick()
  assert('… asked again when the item changes', labels('e') === 'Red,Green,Blue' && select('e').value === 'g')
  assert('a source that answers at once', labels('f') === ',x,y,z' && calls === 1)
  assert('required: no choice is invalid', $('#f').hasAttribute('invalid') && !$('#f')._component.valid)
  got.length = 0
  choose('f', 'y')
  assert('… a choice makes it valid', !$('#f').hasAttribute('invalid'))
  assert('disabled and label', select('g').disabled && select('g').getAttribute('aria-label') === 'Letter')
  $('#a')._component.options = [{label: 'One', value: '1'}, 'Two']
  assert('the options property', labels('a') === 'One,Two' && select('a').options[1].value === 'Two')
  captureConsole()
  sandbox.insertAdjacentHTML('beforeend', '<rc-select source="tuUnknown x"></rc-select><rc-select source="tuUnknown y"></rc-select>')
  const lines = releaseConsole()
  assert('an unknown source: reported once', lines.filter(l => l.includes('tuUnknown')).length === 1)
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-select: one request for several selects', async () => {
  const waiting = []
  const asked = []
  defineOptionSources({
    tuShared: {
      options: (sheet, element) => {
        asked.push([sheet, element.id])
        return new Promise(resolve => waiting.push(() => resolve([{label: `${sheet} A`, value: 'a'}, {label: `${sheet} B`, value: 'b'}])))
      },
      events: ['tuSharedRefresh']
    },
    tuFailing: () => Promise.reject(new Error('offline'))
  })
  sandbox.innerHTML = `
    <rc-select id="s1" source="tuShared Groups" value="a"></rc-select>
    <rc-select id="s2" source="tuShared Groups" value="b"></rc-select>
    <rc-select id="s3" source="tuShared Groups"></rc-select>
    <rc-select id="s4" source="tuShared Cards"></rc-select>`
  await tick()
  const labels = id => [...$(`#${id} > select`).options].map(o => o.textContent).join()
  assert('three selects, same source and argument: one request', asked.filter(a => a[0] === 'Groups').length === 1)
  assert('… with the element of the first select', asked[0][1] === 's1')
  assert('another argument: its own request', asked.filter(a => a[0] === 'Cards').length === 1 && waiting.length === 2)
  waiting.shift()()
  waiting.shift()()
  await tick()
  assert('every select gets the options', labels('s1') === 'Groups A,Groups B' && labels('s2') === labels('s1') &&
    labels('s3') === labels('s1') && labels('s4') === 'Cards A,Cards B')
  assert('… and keeps its own value', $('#s1 > select').value === 'a' && $('#s2 > select').value === 'b')
  assert('… each its own copy', $('#s1')._component.list[0] !== $('#s2')._component.list[0])
  asked.length = 0
  bus.emit('tuSharedRefresh', {})
  assert('an event asks again: one request per argument', asked.length === 2 && waiting.length === 2)
  waiting.shift()()
  waiting.shift()()
  await tick()
  asked.length = 0
  sandbox.insertAdjacentHTML('beforeend', '<rc-select id="s5" source="tuShared Groups"></rc-select>')
  await tick()
  assert('once answered, nothing is kept: a new select asks again', asked.length === 1)
  waiting.shift()()
  await tick()
  assert('… and gets the options', labels('s5') === 'Groups A,Groups B')
  captureConsole()
  sandbox.insertAdjacentHTML('beforeend', '<rc-select id="s6" source="tuFailing x"></rc-select><rc-select id="s7" source="tuFailing x"></rc-select>')
  await tick()
  await tick()
  const lines = releaseConsole()
  assert('a failed request is reported, and forgotten', lines.some(l => l.includes('tuFailing')) && labels('s6') === '')
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-tabs', async () => {
  config.setItem('tu-tab', 'b')
  sandbox.innerHTML = `
    <rc-tabs id="t" data-event="tuAction" data-param='{"tabs": "t"}'>
      <rc-tab value="a" label="Alpha" icon="save" title="First">A <rc-checkbox id="keep">kept</rc-checkbox></rc-tab>
      <rc-tab value="b" label="Beta">B</rc-tab>
      <rc-tab value="c" label="Gamma" disabled>C</rc-tab>
      <rc-tab value="d" label="Delta">D</rc-tab>
    </rc-tabs>
    <rc-tabs id="u" data-item="tu-tab"><rc-tab label="a">A</rc-tab><rc-tab label="b">B</rc-tab></rc-tabs>`
  await tick()
  const t = $('#t')
  const bar = t.querySelector('[role="tablist"]')
  const titles = () => [...bar.children]
  const shown = el => [...el.querySelectorAll(':scope > rc-tab')].filter(tab => !tab.hidden).map(tab => tab.getAttribute('value') ?? tab.getAttribute('label')).join()
  assert('a bar of titles, one per tab, before the tabs', bar === t.firstElementChild && titles().map(b => b.textContent).join() === 'Alpha,Beta,Gamma,Delta')
  assert('roles and links for screen readers', titles()[0].getAttribute('role') === 'tab' && t.querySelector('rc-tab').getAttribute('role') === 'tabpanel' &&
    titles()[0].getAttribute('aria-controls') === t.querySelector('rc-tab').id && t.querySelector('rc-tab').getAttribute('aria-labelledby') === titles()[0].id)
  assert('icon, title and disabled on the title', titles()[0].querySelector('rc-icon') !== null && titles()[0].title === 'First' && titles()[2].disabled)
  assert('no value: the first tab is shown, the others hidden', shown(t) === 'a' && t._component.value === 'a' &&
    titles()[0].getAttribute('aria-selected') === 'true' && titles()[0].tabIndex === 0 && titles()[1].tabIndex === -1)
  got.length = 0
  $('#keep button').click()
  titles()[1].click()
  assert('a click shows its tab and runs the actions with its value', shown(t) === 'b' && got.length === 1 && got[0].tabs === 't' && got[0].value === 'b')
  titles()[1].click()
  assert('a click on the tab shown runs nothing', got.length === 1)
  titles()[2].click()
  assert('a disabled tab cannot be shown', shown(t) === 'b')
  assert('the content of a hidden tab keeps its state', $('#keep')._component.value === 'yes')
  t.setAttribute('value', 'd')
  assert('the value attribute shows a tab, no action', shown(t) === 'd' && got.length === 1)
  t.setAttribute('value', 'c')
  assert('a disabled or unknown value: the first enabled tab', shown(t) === 'a')
  const key = (button, code) => button.dispatchEvent(new KeyboardEvent('keydown', {code, key: code, bubbles: true, cancelable: true}))
  key(titles()[0], 'ArrowRight')
  assert('→ shows the next tab and moves the focus', shown(t) === 'b' && document.activeElement === titles()[1] && got.length === 2)
  key(titles()[1], 'ArrowRight')
  assert('… skipping the disabled tabs', shown(t) === 'd')
  key(titles()[3], 'ArrowRight')
  assert('… and going round', shown(t) === 'a')
  key(titles()[0], 'End')
  key(titles()[3], 'ArrowLeft')
  assert('End, ←', shown(t) === 'b')
  key(titles()[1], 'Home')
  assert('Home', shown(t) === 'a')
  t.insertAdjacentHTML('beforeend', '<rc-tab value="e" label="Epsilon">E</rc-tab>')
  t.querySelector('rc-tab[value="b"]').setAttribute('label', 'Bêta')
  await tick()
  assert('a tab added, a label changed: the bar follows', titles().map(b => b.textContent).join() === 'Alpha,Bêta,Gamma,Delta,Epsilon' && shown(t) === 'a')
  t.querySelector('rc-tab[value="a"]').remove()
  await tick()
  assert('the tab shown removed: the first enabled one', shown(t) === 'b')
  const u = $('#u')
  assert('data-item: the tab of the item; value defaults to the label', shown(u) === 'b')
  u.querySelector('[role="tab"]').click()
  assert('a click sets the item', config.get('tu-tab') === 'a')
  config.setItem('tu-tab', 'b')
  await tick()
  assert('the tabs follow the item', shown(u) === 'b')
  sandbox.innerHTML = ''
  await tick()
})

await describe('rc-slider', async () => {
  config.setItem('tu-volume', '40')
  sandbox.innerHTML = `
    <rc-slider id="a" min="10" max="50" step="5" value="20" unit=" %" label="Volume" data-event="tuAction" data-param='{"s": "a"}'></rc-slider>
    <rc-slider id="b" data-item="tu-volume"></rc-slider>
    <rc-slider id="c" commit="change" no-value data-event="tuAction"></rc-slider>
    <rc-slider id="d" disabled value="30"></rc-slider>`
  await tick()
  const field = id => $(`#${id} > input`)
  const move = (id, value) => {
    field(id).value = value
    field(id).dispatchEvent(new Event('input', {bubbles: true}))
  }
  const release = id => field(id).dispatchEvent(new Event('change', {bubbles: true}))
  const shown = id => $(`#${id} > output`).textContent
  assert('a native range with its bounds, its value shown with the unit', field('a').type === 'range' && field('a').min === '10' &&
    field('a').max === '50' && field('a').step === '5' && field('a').value === '20' && shown('a') === '20 %' && field('a').getAttribute('aria-label') === 'Volume')
  assert('the part before the thumb', field('a').style.getPropertyValue('--rc-fill') === '25%')
  got.length = 0
  move('a', '35')
  assert('a move runs the actions with the value, and shows it', got.length === 1 && got[0].s === 'a' && got[0].value === '35' && shown('a') === '35 %' && $('#a').dataset.value === '35')
  $('#a').setAttribute('value', '99')
  assert('a value above max: brought back, no action', field('a').value === '50' && $('#a')._component.value === '50' && got.length === 1)
  $('#a')._component.value = 12
  assert('… on the step', field('a').value === '10')
  $('#a').setAttribute('max', '200')
  $('#a').setAttribute('value', '150')
  assert('a bound that changes', field('a').value === '150')
  assert('data-item: the slider shows the item; defaults 0 to 100, step 1', field('b').value === '40' && field('b').max === '100')
  move('b', '73')
  assert('a move sets the item', config.get('tu-volume') === '73')
  config.setItem('tu-volume', '12')
  await tick()
  assert('the slider follows the item', field('b').value === '12' && shown('b') === '12')
  got.length = 0
  move('c', '60')
  assert('commit=change: nothing while it moves', got.length === 0)
  release('c')
  assert('… the actions run when it is released', got.length === 1 && got[0].value === '60')
  assert('no-value: the value is not shown', $('#c > output').hidden)
  assert('disabled', field('d').disabled)
  sandbox.innerHTML = ''
  await tick()
  bus.off('tuAction', onEvent)
  bus.off('tuOther', onEvent)
})
