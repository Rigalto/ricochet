// tests/test-w-controller.mjs — node tests/run.mjs WController
// What does not need a DOM: named methods, bus subscriptions, configuration items, intervals, release().
// Mounting, attributes, DOM events and animation frames are checked in the browser test page.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {WController} from '../src/core/w-controller.mjs'
import {bus} from '../src/core/bus.mjs'
import {setItemStore} from '../src/core/items.mjs'
import {$global} from '../src/core/global.mjs'

// a store of configuration items that records what it receives
const fakeStore = () => {
  const store = {observers: new Map(), nextId: 1, values: {}, set: []}
  store.addObserver = (items, recall) => {
    const id = store.nextId++
    store.observers.set(id, {items, recall})
    recall(Object.fromEntries(items.map(i => [i, store.values[i]])))
    return id
  }
  store.removeObserver = id => store.observers.delete(id)
  store.setItem = (item, value) => store.set.push([item, value])
  store.setItemIfValue = (item, expected, value) => store.set.push([item, value, expected])
  return store
}

describe('WController — global state', () => {
  assert('$global is shared with globalThis', globalThis.$global === $global)
  assert('debug switches exist', $global.debug.lifecycle === false && $global.debug.deprecated === false)
  assert('leak counters exist', typeof $global.memoryLeak.eventHandlers === 'number')
})

describe('WController — listen(): default and named methods', () => {
  class C extends WController {
    constructor () { super(); this.got = []; this.listen('wcPing'); this.listen('wcPong', 'onPong') }
    wcPingDispatched (payload) { this.got.push(['ping', payload, this]) }
    onPong (payload) { this.got.push(['pong', payload]) }
  }
  const c = new C()
  bus.emit('wcPing', {a: 1})
  bus.emit('wcPong', 2)
  assert('<event>Dispatched receives the payload', c.got[0][0] === 'ping' && c.got[0][1].a === 1)
  assert('this is the instance', c.got[0][2] === c)
  assert('a named method works', c.got[1][0] === 'pong' && c.got[1][1] === 2)
  c.release()
})

describe('WController — listen() is idempotent and never overwrites the method', () => {
  class C extends WController {
    constructor () { super(); this.n = 0 }
    wcTwiceDispatched () { this.n++ }
  }
  const c = new C()
  const original = c.wcTwiceDispatched
  c.listen('wcTwice')
  c.listen('wcTwice')
  c.listen(['wcTwice'])
  bus.emit('wcTwice')
  assert('subscribed once', c.n === 1 && bus.count('wcTwice') === 1)
  assert('the method of the instance is untouched', c.wcTwiceDispatched === original && !Object.hasOwn(c, 'wcTwiceDispatched'))
  c.release()
})

describe('WController — missing method', () => {
  class C extends WController { constructor () { super(); this.listen('wcNothing') } }
  captureConsole()
  const before = $global.memoryLeak.eventHandlers
  new C() // eslint-disable-line no-new
  const lines = releaseConsole()
  assert('reported when subscribing, with the expected name', lines.some(l => l.includes("'wcNothingDispatched'")))
  assert('nothing subscribed', !bus.has('wcNothing') && $global.memoryLeak.eventHandlers === before)
})

describe('WController — unlisten() and the leak counter', () => {
  class C extends WController {
    wcAaDispatched () {}
    wcBbDispatched () {}
  }
  const c = new C()
  const before = $global.memoryLeak.eventHandlers
  c.listen(['wcAa', 'wcBb'])
  assert('counter +2', $global.memoryLeak.eventHandlers === before + 2)
  c.unlisten('wcAa')
  assert('unlisten() removes one subscription', !bus.has('wcAa') && bus.has('wcBb'))
  assert('counter -1', $global.memoryLeak.eventHandlers === before + 1)
  c.unlistenAll()
  assert('unlistenAll() removes the others', !bus.has('wcBb') && $global.memoryLeak.eventHandlers === before)
})

describe('WController — former API (facade)', () => {
  class C extends WController {
    constructor () { super(); this.got = []; this.observeEvents('wcOld') }
    wcOldDispatched (e) { this.got.push(e) }
  }
  const c = new C()
  c.dispatchEvent('wcOld', {x: 1})
  WController.dispatchEvent('wcOld')
  assert('the method receives {type, detail}', c.got[0].type === 'wcOld' && c.got[0].detail.x === 1)
  assert('detail defaults to {}', typeof c.got[1].detail === 'object')
  c.unobserveEvents('wcOld')
  assert('unobserveEvents() really unsubscribes', !bus.has('wcOld'))
  captureConsole()
  $global.debug.deprecated = true
  const d = new C()
  d.observeEvents('wcOld2', 'wcOldDispatched')
  $global.debug.deprecated = false
  const lines = releaseConsole()
  assert('the first use of a deprecated method is reported once per class',
    lines.filter(l => l.includes('C.observeEvents is deprecated')).length === 1)
  d.release()
})

describe('WController — configuration items', () => {
  const store = fakeStore()
  store.values.color = 'red'
  setItemStore(store)
  class C extends WController {
    constructor () { super(); this.got = []; this.observeItems(['color', 'size']); this.observeItems('mode', 'onMode') }
    itemsChanged (items) { this.got.push(items) }
    onMode (items) { this.got.push(['mode', items]) }
  }
  const before = $global.memoryLeak.configObserver
  const c = new C()
  assert('the method is called at once with the current values', c.got[0].color === 'red' && 'size' in c.got[0])
  assert('a named method works', c.got[1][0] === 'mode')
  c.observeItems(['color', 'size'])
  assert('observing the same items twice has no effect', store.observers.size === 2)
  assert('counter +2', $global.memoryLeak.configObserver === before + 2)
  c.setItem('color', 'blue')
  WController.setItems([{item: 'a', value: '1'}, {item: 'b', value: '2'}])
  WController.setItemIfValue('c', 'x', 'y')
  assert('setItem / setItems / setItemIfValue reach the store', store.set.length === 4 && store.set[3][2] === 'x')
  c.unobserveItems()
  assert('unobserveItems() removes every observation', store.observers.size === 0 && $global.memoryLeak.configObserver === before)
})

describe('WController — intervals', () => {
  class C extends WController { tick () {} }
  const c = new C()
  const before = $global.memoryLeak.setInterval
  c.setInterval('tick', 1000)
  c.setInterval('tick', 500)
  assert('restarting the same interval does not add one', $global.memoryLeak.setInterval === before + 1)
  c.clearInterval('tick')
  assert('clearInterval() stops it', $global.memoryLeak.setInterval === before)
  captureConsole()
  c.setInterval('missing', 100)
  const lines = releaseConsole()
  assert('a missing method is reported', lines.some(l => l.includes("'missing'")))
})

describe('WController — release()', () => {
  setItemStore(fakeStore())
  class C extends WController {
    wcRelDispatched () {}
    itemsChanged () {}
    tick () {}
  }
  const c = new C()
  const leaks = {...$global.memoryLeak}
  c.listen('wcRel')
  c.observeItems('x')
  c.setInterval('tick', 1000)
  c.release()
  const now = $global.memoryLeak
  assert('every counter is back to its level',
    now.eventHandlers === leaks.eventHandlers && now.configObserver === leaks.configObserver && now.setInterval === leaks.setInterval)
  assert('the bus has no listener left', !bus.has('wcRel'))
})
