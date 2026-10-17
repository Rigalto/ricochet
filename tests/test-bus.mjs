// tests/test-bus.mjs — node tests/run.mjs Bus
// Each describe() creates its own EventBus: no shared state.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {EventBus, bus} from '../src/core/bus.mjs'

describe('Bus — on(): subscription', () => {
  const b = new EventBus()
  const fn = () => {}
  b.on('ping', fn)
  assert('the listener is registered', b.count('ping') === 1 && b.has('ping'))
  b.on('ping', fn)
  assert('the same function twice: no duplicate', b.count('ping') === 1)
  b.on('ping', () => {})
  assert('two different functions: two listeners', b.count('ping') === 2)
})

describe('Bus — on(): checks', () => {
  const b = new EventBus()
  let thrown = false
  try { b.on('ping', 'notAFunction') } catch (error) { thrown = error instanceof TypeError }
  assert('a listener that is not a function throws a TypeError', thrown)
  captureConsole()
  b.on('time/clock', () => {})
  b.on('table-row', () => {})
  b.on('tableRowSelected', () => {})
  const lines = releaseConsole()
  assert('names with "/" or "-" are reported', lines.length === 2 && lines.every(l => l.includes('camelCase')))
  assert('they are subscribed anyway', b.has('time/clock') && b.has('table-row'))
})

describe('Bus — off()', () => {
  const b = new EventBus()
  const fn = () => {}
  b.on('ping', fn)
  b.off('ping', fn)
  assert('off() removes the listener', b.count('ping') === 0)
  assert('the event is forgotten when it has no listener left', !b.has('ping'))
  b.off('ghost', fn)
  assert('off() on an unknown event does nothing', !b.has('ghost'))
  b.on('ping', fn)
  b.off('ping', () => {})
  assert('off() with another function removes nothing', b.count('ping') === 1)
})

describe('Bus — emit(): payload and order', () => {
  const b = new EventBus()
  const calls = []
  const payload = {value: 42}
  b.on('ping', p => calls.push(['a', p]))
  b.on('ping', p => calls.push(['b', p]))
  const count = b.emit('ping', payload)
  assert('every listener is called', calls.length === 2)
  assert('in subscription order', calls[0][0] === 'a' && calls[1][0] === 'b')
  assert('with the same payload object', calls[0][1] === payload && calls[1][1] === payload)
  assert('emit() returns the number of listeners called', count === 2)
  assert('emit() without listener returns 0', b.emit('ghost') === 0)
})

describe('Bus — emit() is synchronous', () => {
  const b = new EventBus()
  let done = false
  b.on('ping', () => { done = true })
  b.emit('ping')
  assert('the listener has run when emit() returns', done)
})

describe('Bus — errors in a listener', () => {
  const b = new EventBus()
  let secondCalled = false
  b.on('err', function failing () { throw new Error('boom') })
  b.on('err', () => { secondCalled = true })
  captureConsole()
  b.emit('err')
  const lines = releaseConsole()
  assert('the next listeners still run', secondCalled)
  assert('the error is reported with the event and the listener name',
    lines.length === 1 && lines[0].includes("'failing'") && lines[0].includes("'err'"))
})

describe('Bus — changes during emit()', () => {
  const b = new EventBus()
  const calls = []
  const late = () => calls.push('late')
  const removed = () => calls.push('removed')
  b.on('ping', () => {
    calls.push('first')
    b.on('ping', late)
    b.off('ping', removed)
  })
  b.on('ping', removed)
  b.emit('ping')
  assert('a listener removed during emit() is still called by it', calls.includes('removed'))
  assert('a listener added during emit() is not called by it', !calls.includes('late'))
  calls.length = 0
  b.emit('ping')
  assert('the next emit() sees both changes', calls.includes('late') && !calls.includes('removed'))
})

describe('Bus — nested emits and loops', () => {
  const b = new EventBus()
  const order = []
  b.on('outer', () => { order.push('outer'); b.emit('inner') })
  b.on('inner', () => order.push('inner'))
  b.emit('outer')
  assert('an emit() inside a listener runs at once', order.join() === 'outer,inner')

  let calls = 0
  b.on('loopA', () => { calls++; b.emit('loopB') })
  b.on('loopB', () => { calls++; b.emit('loopA') })
  captureConsole()
  b.emit('loopA')
  const lines = releaseConsole()
  assert('a loop between listeners is stopped', calls === 64)
  assert('and reported once', lines.length === 1 && lines[0].includes('loop'))
  b.on('after', () => calls++)
  b.emit('after')
  assert('the bus works normally afterwards', calls === 65)
})

describe('Bus — tracer', () => {
  const b = new EventBus()
  const traced = []
  b.on('ping', () => {})
  b.setTracer((name, payload, count) => traced.push({name, payload, count}))
  b.emit('ping', 1)
  b.emit('ghost', 2)
  b.setTracer(null)
  b.emit('ping', 3)
  assert('the tracer sees every emit, with or without listeners', traced.length === 2)
  assert('with the name, the payload and the number of listeners',
    traced[0].name === 'ping' && traced[0].payload === 1 && traced[0].count === 1 && traced[1].count === 0)
})

describe('Bus — stats() and clear()', () => {
  const b = new EventBus()
  function onB () {}
  b.on('beta', onB)
  b.on('alpha', () => {})
  const stats = b.stats()
  assert('events sorted by name', stats.map(s => s.name).join() === 'alpha,beta')
  assert('listeners shown by name', stats[1].listeners[0] === 'onB' && stats[0].listeners[0] === '(anonymous)')
  b.clear()
  assert('clear() removes every listener', !b.has('alpha') && !b.has('beta'))
})

describe('Bus — shared instance', () => {
  assert('bus is an EventBus', bus instanceof EventBus)
})
