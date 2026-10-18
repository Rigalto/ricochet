// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-elements.mjs — open tests/browser/index.html in a browser
// WComponent as native Custom Elements and as [as] elements.

import {describe, assert, captureConsole, releaseConsole} from '../kernel.mjs'
import {WComponent} from '../../src/core/w-component.mjs'
import {$global} from '../../src/core/global.mjs'
import {bus} from '../../src/core/bus.mjs'
import {css} from '../../src/core/css.mjs'

const sandbox = document.getElementById('sandbox')
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const leaks = $global.memoryLeak

const log = []
class Basic extends WComponent {
  attach () {
    log.push(['attach', this.element.localName])
    this.innerHTML('<span name="label">basic</span>')
    this.listen('teBasicPing')
  }

  teBasicPingDispatched (payload) { log.push(['ping', payload]) }
  detach () { log.push(['detach', this.element.localName]) }
}
WComponent.define('te-basic', Basic)

await describe('Elements — a custom element is mounted', async () => {
  log.length = 0
  const attached = leaks.attached
  sandbox.innerHTML = '<te-basic id="b1"></te-basic>'
  const element = document.getElementById('b1')
  assert('before the first render(): it waits', log.length === 0 && element._component === undefined)
  WComponent.render(document.getElementById('nothing'))
  assert('the first render() mounts it', log.length === 1 && log[0][1] === 'te-basic')
  element.remove()
  sandbox.innerHTML = '<te-basic id="b1"></te-basic>'
  const fresh = document.getElementById('b1')
  assert('then attach() at once, when an element enters the page', log.length === 2 && fresh._component instanceof Basic)
  await tick()
  log.length = 0
  const again = document.createElement('te-basic')
  again.id = 'b1'
  sandbox.replaceChildren(again)
  assert('as soon as it is connected', log.length === 1 && log[0][1] === 'te-basic')
  assert('this.element is the element', again._component.element === again)
  await tick()
  assert('counted', leaks.attached === attached + 1)
  assert('its content', again.querySelector('[name="label"]').textContent === 'basic')
  bus.emit('teBasicPing', 1)
  assert('its subscriptions work', log.at(-1)[1] === 1)
})

await describe('Elements — the same class with the as attribute', async () => {
  log.length = 0
  sandbox.innerHTML = '<div as="te-basic" id="b2"></div>'
  assert('not mounted before render()', log.length === 0)
  WComponent.render(sandbox)
  const element = document.getElementById('b2')
  assert('mounted by render()', log.length === 1 && log[0][1] === 'div' && element._component instanceof Basic)
})

await describe('Elements — detached when removed, kept when moved', async () => {
  sandbox.innerHTML = '<div id="a"></div><div id="b"></div>'
  await tick() // the elements of the former tests are detached
  const element = document.createElement('te-basic')
  document.getElementById('a').append(element)
  const component = element._component
  const handlers = leaks.eventHandlers
  log.length = 0
  document.getElementById('b').append(element) // a move: disconnected, then connected again
  await tick()
  assert('moved: same component, no detach()', element._component === component && log.length === 0)
  element.remove()
  assert('removed: not detached during the task', element._component === component)
  await tick()
  assert('then detached', element._component === null && log.at(-1)[0] === 'detach')
  assert('its subscriptions are released', leaks.eventHandlers === handlers - 1)
  log.length = 0
  bus.emit('teBasicPing', 2)
  assert('no more events', log.length === 0)
  sandbox.append(element)
  assert('put back in the page: a new component', element._component instanceof Basic && element._component !== component)
  element.remove()
  await tick()
})

await describe('Elements — nested elements and innerHTML()', async () => {
  class Outer extends WComponent {
    attach () { this.innerHTML('<te-basic></te-basic><div as="te-basic"></div>') }
  }
  WComponent.define('te-outer', Outer)
  log.length = 0
  sandbox.innerHTML = '<te-outer id="o"></te-outer>'
  const outer = document.getElementById('o')
  assert('both syntaxes inside, mounted', log.filter(l => l[0] === 'attach').map(l => l[1]).join() === 'te-basic,div')
  const attached = leaks.attached
  sandbox.innerHTML = ''
  await tick()
  assert('removing the parent detaches every component inside', leaks.attached === attached - 3 && outer._component === null)
})

await describe('Elements — defined after being inserted', async () => {
  sandbox.innerHTML = '<te-late id="l"></te-late>'
  const element = document.getElementById('l')
  assert('not mounted while its class is unknown', element._component === undefined)
  class Late extends WComponent { attach () { this.element.textContent = 'late' } }
  WComponent.define('te-late', Late)
  assert('mounted when its class is defined', element._component instanceof Late && element.textContent === 'late')
})

await describe('Elements — observed attributes', async () => {
  const calls = []
  class Attr extends WComponent {
    static observedAttributes = ['icon', 'no-label']
    attach () { calls.push(['attach']) }
    iconChanged (value, old) { calls.push(['icon', value, old]) }
    noLabelChanged (value, old) { calls.push(['noLabel', value, old]) }
  }
  WComponent.define('te-attr', Attr)
  sandbox.innerHTML = '<te-attr id="t" icon="add"></te-attr>'
  const element = document.getElementById('t')
  assert('after attach(), the current values', calls.map(c => c.join(':')).join() === 'attach,icon:add:,noLabel::')
  calls.length = 0
  element.setAttribute('icon', 'edit')
  assert('a change: at once, with the former value', calls.length === 1 && calls[0].join() === 'icon,edit,add')
  calls.length = 0
  sandbox.innerHTML = '<div as="te-attr" id="t2" icon="add"></div>'
  WComponent.render(sandbox)
  const div = document.getElementById('t2')
  assert('[as] element: the same calls after attach()', calls.map(c => c.join(':')).join() === 'attach,icon:add:,noLabel::')
  calls.length = 0
  div.setAttribute('no-label', '')
  await tick()
  assert('[as] element: changes through a mutation observer', calls.length === 1 && calls[0].join() === 'noLabel,,')
  captureConsole()
  class Missing extends WComponent { static observedAttributes = ['size']; attach () {} }
  WComponent.define('te-missing', Missing)
  const lines = releaseConsole()
  assert('a missing method is reported by define()', lines.some(l => l.includes("no method 'sizeChanged'")))
  sandbox.innerHTML = ''
  await tick()
})

await describe('Elements — default display', async () => {
  class Inline extends WComponent {
    static display = 'inline'
    attach () {}
  }
  WComponent.define('te-inline', Inline)
  class Flex extends WComponent {
    static display = 'flex'
    attach () {}
  }
  WComponent.define('te-flex', Flex)
  css('te-basic.wide { display: grid; }')
  await tick()
  sandbox.innerHTML = '<te-basic id="d1"></te-basic><te-inline id="d2"></te-inline><te-flex id="d3"></te-flex><te-basic id="d4" class="wide"></te-basic>'
  const display = id => getComputedStyle(document.getElementById(id)).display
  assert('block by default, like a <div>', display('d1') === 'block')
  assert('static display: inline', display('d2') === 'inline')
  assert('static display: flex', display('d3') === 'flex')
  assert('the CSS of the application wins (layer ricochet)', display('d4') === 'grid')
  sandbox.innerHTML = ''
  await tick()
})

await describe('Elements — errors', async () => {
  captureConsole()
  WComponent.define('te-basic', Basic)
  const lines = releaseConsole()
  assert('a tag defined twice is reported', lines.some(l => l.includes("'te-basic' is defined twice")))
})
