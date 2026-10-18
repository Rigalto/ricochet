// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-tasks.mjs — node tests/run.mjs Tasks
// Microtasks, scheduled tasks, clocks and the frame loop, with fake clocks and a fake requestAnimationFrame.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {Microtasker} from '../src/core/microtasker.mjs'
import {Scheduler} from '../src/core/scheduler.mjs'
import {GameClock} from '../src/core/clock.mjs'
import {FrameLoop} from '../src/core/loop.mjs'
import {WController} from '../src/core/w-controller.mjs'
import {microtasker as kernelTasks} from '../src/core/microtasker.mjs'
import {scheduler as kernelScheduler} from '../src/core/scheduler.mjs'
import {loop as kernelLoop} from '../src/core/loop.mjs'
import {bus} from '../src/core/bus.mjs'
import {$global} from '../src/core/global.mjs'

// a fake time, advanced by the tests; work() makes a listener "take" some milliseconds
const fakeTime = () => {
  const t = {now: 0}
  t.fn = () => t.now
  t.work = ms => { t.now += ms }
  return t
}

// records the events received from the bus
const record = (names, time) => {
  const got = []
  const listeners = names.map(name => {
    const fn = payload => got.push([name, payload])
    bus.on(name, fn)
    return [name, fn]
  })
  got.stop = () => { for (const [name, fn] of listeners) { bus.off(name, fn) } }
  got.names = () => got.map(g => g[0]).join()
  return got
}

describe('Tasks — microtasks: priority, cost and order', () => {
  const time = fakeTime()
  const tasks = new Microtasker({now: time.fn})
  tasks.declare({tkLow: {priority: 1, cost: 1}, tkHigh: {priority: 5, cost: 1}, tkBig: {priority: 3, cost: 4}})
  const got = record(['tkLow', 'tkHigh', 'tkBig'])
  tasks.defer('tkLow', 1)
  tasks.defer('tkHigh', 2)
  tasks.defer('tkLow', 3)
  tasks.defer('tkBig', 4)
  assert('four tasks waiting', tasks.size === 4)
  tasks.run(10)
  assert('highest priority first, same priority in deferral order', got.names() === 'tkHigh,tkBig,tkLow,tkLow' &&
    got[2][1] === 1 && got[3][1] === 3)
  got.stop()
})

describe('Tasks — microtasks: budget', () => {
  const time = fakeTime()
  const tasks = new Microtasker({now: time.fn})
  tasks.declare({tkSlow: {priority: 5, cost: 3}, tkFast: {priority: 1, cost: 0.5}})
  const onSlow = () => time.work(3)
  const onFast = () => time.work(0.5)
  bus.on('tkSlow', onSlow)
  bus.on('tkFast', onFast)
  tasks.defer('tkSlow')
  tasks.defer('tkSlow')
  tasks.defer('tkFast')
  let count = tasks.run(4)
  assert('a task runs only if its cost fits: one slow, then the fast one', count === 2 && tasks.size === 1)
  count = tasks.run(1)
  assert('nothing fits: nothing runs', count === 0)
  count = tasks.run(1, true)
  assert('force runs the first task anyway', count === 1 && tasks.size === 0)
  const stats = tasks.stats()
  assert('durations are measured per event', stats.tkSlow.count === 2 && stats.tkSlow.max === 3 &&
    stats.tkSlow.cost === 3 && stats.tkSlow.histogram[6] === 2)
  bus.off('tkSlow', onSlow)
  bus.off('tkFast', onFast)
})

describe('Tasks — microtasks: once, owner, undeclared', () => {
  const tasks = new Microtasker()
  const owner = {}
  const before = $global.memoryLeak.microtasks
  tasks.defer('tkOnce', 1, {once: true, owner})
  tasks.defer('tkOnce', 2, {once: true, owner})
  tasks.defer('tkOnce', 3, {once: true})
  assert('once: one task per event and owner', tasks.size === 2)
  assert('owned tasks are counted', $global.memoryLeak.microtasks === before + 1)
  tasks.cancelOwner(owner)
  assert('cancelOwner() removes them', tasks.size === 1 && $global.memoryLeak.microtasks === before)
  $global.debug.tasks = true
  captureConsole()
  tasks.defer('tkUnknown')
  tasks.defer('tkUnknown')
  const lines = releaseConsole()
  $global.debug.tasks = false
  assert('an undeclared event is reported once in debug mode', lines.filter(l => l.includes("'tkUnknown' is not declared")).length === 1)
  let woken = 0
  tasks.setWaker(() => woken++)
  tasks.defer('tkWake')
  assert('deferring wakes the loop', woken === 1)
})

describe('Tasks — scheduled tasks: due time and order', () => {
  const clocks = {real: {time: 0}, game: {time: 0}}
  const tasks = new Microtasker()
  const scheduler = new Scheduler({clocks, microtasker: tasks})
  const got = record(['tkA', 'tkB', 'tkC'])
  scheduler.schedule('tkB', 'b1', 200)
  scheduler.schedule('tkA', 'a', 100)
  scheduler.schedule('tkB', 'b2', 200)
  scheduler.schedule('tkC', 'c', 50, {clock: 'game'})
  clocks.real.time = 150
  clocks.game.time = 100
  assert('one real task due', scheduler.update() === 1)
  tasks.run(10)
  assert('it ran as a microtask', got.names() === 'tkA')
  assert('game tasks wait while no game holds the loop', scheduler.size('game') === 1)
  clocks.real.time = 200
  scheduler.update(true)
  tasks.run(10)
  assert('tasks due at the same time run in scheduling order', got.names() === 'tkA,tkB,tkB,tkC' &&
    got[1][1] === 'b1' && got[2][1] === 'b2')
  assert('at: an absolute due time', scheduler.schedule('tkA', null, 0, {at: 500}) === 500)
  got.stop()
})

describe('Tasks — scheduled tasks: modes and cancellation', () => {
  const clocks = {real: {time: 1000}, game: {time: 0}}
  const scheduler = new Scheduler({clocks, microtasker: new Microtasker()})
  scheduler.schedule('tkSave', null, 2000, {id: 'save', mode: 'once'})
  clocks.real.time = 1500
  assert('once: kept if already waiting', scheduler.schedule('tkSave', null, 2000, {id: 'save', mode: 'once'}) === 3000 &&
    scheduler.size() === 1)
  assert('restart: replaced', scheduler.schedule('tkSave', null, 2000, {id: 'save', mode: 'restart'}) === 3500 &&
    scheduler.size() === 1)
  assert('extend: pushed back by the delay', scheduler.schedule('tkSave', null, 1000, {id: 'save', mode: 'extend'}) === 4500 &&
    scheduler.size() === 1)
  assert('extend: added when absent', scheduler.schedule('tkGrow', null, 100, {id: 'grow-1', mode: 'extend'}) === 1600)
  scheduler.schedule('tkGrow', null, 100, {id: 'grow-2'})
  assert('has() and dueTime()', scheduler.has('save') && scheduler.dueTime('save') === 4500 && !scheduler.has('other'))
  assert('cancel() with a regular expression', scheduler.cancel(/^grow-/) === 2 && scheduler.size() === 1)
  const owner = {}
  const before = $global.memoryLeak.scheduledTasks
  scheduler.schedule('tkMine', null, 10, {id: 'mine', owner})
  scheduler.schedule('tkMine', null, 10, {id: 'mine'})
  assert('cancel() limited to an owner', scheduler.cancel('mine', owner) === 1 && scheduler.has('mine'))
  scheduler.schedule('tkMine', null, 10, {owner})
  assert('owned tasks are counted', $global.memoryLeak.scheduledTasks === before + 1)
  scheduler.cancelOwner(owner)
  assert('cancelOwner()', $global.memoryLeak.scheduledTasks === before)
  assert('nextRealTime() skips cancelled tasks', scheduler.nextRealTime() === 1510)
  assert('list() describes the tasks', scheduler.list()[0].startsWith('mine: tkMine'))
})

describe('Tasks — game clock', () => {
  const clock = new GameClock()
  clock.set(1000)
  assert('advance() adds the duration', clock.advance(16) === 16 && clock.time === 1016)
  clock.scale = 2
  clock.advance(10)
  assert('scale', clock.time === 1036)
  clock.pause()
  assert('paused: no advance', clock.advance(10) === 0 && clock.time === 1036 && clock.paused)
  clock.resume()
  assert('resume', clock.advance(1) === 2)
})

// a loop driven by hand: request() keeps the callback, frame(t) runs it
const fakeLoop = () => {
  const time = fakeTime()
  const tasks = new Microtasker({now: time.fn})
  const clock = new GameClock()
  const clocks = {real: {get time () { return time.now }}, game: clock}
  const scheduler = new Scheduler({clocks, microtasker: tasks})
  const env = {time, tasks, clock, scheduler, requested: 0, timers: []}
  env.loop = new FrameLoop({
    request: () => { env.requested++ },
    now: time.fn,
    setTimer: (fn, delay) => { env.timers.push({fn, delay}); return env.timers.length },
    clearTimer: () => {},
    clock,
    microtasker: tasks,
    scheduler,
  })
  // runs n frames, every period ms (the frame timestamps do not depend on the work done in the frames)
  env.frameTime = 0
  env.frames = (n, period) => {
    for (let i = 0; i < n; i++) {
      env.frameTime = Math.max(env.frameTime + period, time.now)
      time.now = env.frameTime
      env.requested = 0
      env.loop.frame(env.frameTime)
    }
  }
  return env
}

describe('Tasks — loop at 60 Hz: one frame per cycle', () => {
  const env = fakeLoop()
  const calls = []
  const owner = {}
  env.loop.addAnimation(owner, (t, dt) => { calls.push(['u', dt]); env.time.work(2) }, () => { calls.push(['r']); env.time.work(3) })
  assert('an animation wakes and holds the loop', env.loop.running && env.loop.held)
  env.frames(30, 1000 / 60)
  const last = calls.slice(-2)
  assert('update then render in each frame', last[0][0] === 'u' && last[1][0] === 'r' && calls.length === 60)
  assert('dt is the duration of the cycle', Math.abs(last[0][1] - 1000 / 60) < 0.01)
  assert('the game clock advances while held', Math.abs(env.clock.time - 30 * 1000 / 60) < 1)
  const stats = env.loop.stats()
  assert('measured: 60 fps, one frame per cycle', stats.fps === 60 && stats.framesPerCycle === 1)
  assert('phase durations', stats.last.update === 2 && stats.last.render === 3)
  assert('the next frame is requested', env.requested === 1)
  env.loop.removeAnimation(owner)
  env.frames(1, 1000 / 60)
  assert('stops when nothing holds it and no task waits', !env.loop.running && env.requested === 0)
})

describe('Tasks — loop at 120 Hz: update and render on alternate frames', () => {
  const env = fakeLoop()
  const calls = []
  env.tasks.declare({tkWork: {priority: 1, cost: 1}})
  const onWork = () => { calls.push('m'); env.time.work(1) }
  bus.on('tkWork', onWork)
  env.loop.addAnimation({}, (t, dt) => { calls.push(`u${Math.round(dt)}`); env.time.work(3) }, () => { calls.push('r'); env.time.work(4) })
  env.frames(40, 1000 / 120) // the measured rate converges to 120 Hz
  calls.length = 0
  for (let i = 0; i < 20; i++) { env.tasks.defer('tkWork') }
  env.frames(2, 1000 / 120)
  const stats = env.loop.stats()
  assert('two frames per cycle', stats.fps >= 118 && stats.framesPerCycle === 2)
  const first = calls.indexOf('r')
  assert('one frame: update and microtasks; the next: render and microtasks',
    calls[0] === 'u17' && first > 1 && calls.slice(1, first).every(c => c === 'm') && calls.slice(first + 1).every(c => c === 'm'))
  // budget of a frame: 12 ms × 8.33 / 16.67 = 6 ms; update 3 → 3 ms of microtasks; render 4 → 2 ms
  assert('microtasks get the 60 Hz budget over the cycle (5 ms)', calls.filter(c => c === 'm').length === 5)
  bus.off('tkWork', onWork)
})

describe('Tasks — loop: microtasks and scheduled tasks wake it', () => {
  const env = fakeLoop()
  const got = record(['tkLater', 'tkNow'])
  env.scheduler.schedule('tkLater', 'x', 500)
  assert('a real task arms a timer while the loop sleeps', !env.loop.running && env.timers.at(-1).delay === 500)
  env.time.now = 500
  env.timers.at(-1).fn()
  assert('the timer wakes the loop', env.loop.running)
  env.frames(1, 0)
  assert('the due task runs in that frame', got.names() === 'tkLater')
  env.frames(1, 16)
  assert('then the loop stops', !env.loop.running)
  env.tasks.defer('tkNow')
  assert('a microtask wakes it', env.loop.running)
  env.frames(1, 16)
  assert('and runs', got.names() === 'tkLater,tkNow' && !env.loop.running)
  got.stop()
})

describe('Tasks — loop: bounded steps and failures', () => {
  const env = fakeLoop()
  const steps = []
  env.loop.addAnimation({}, (t, dt) => steps.push(dt))
  env.frames(1, 16)
  env.frames(1, 40)
  env.frames(1, 300)
  env.frames(1, 5000)
  assert('first frame: one cycle; then the real duration, at most 65 ms; after a long pause: one cycle',
    Math.round(steps[0]) === 17 && steps[1] === 40 && steps[2] === 65 && Math.round(steps[3]) === 17)
  const env2 = fakeLoop()
  const owner = new (class Broken {})()
  env2.loop.addAnimation(owner, () => { throw new Error('boom') })
  captureConsole()
  env2.frames(1, 16)
  const lines = releaseConsole()
  assert('a failing animation is reported with its owner, the loop goes on', lines.some(l => l.includes('update of Broken failed')) && env2.requested === 1)
})

await describe('Tasks — WController: defer, schedule, animation, release', async () => {
  class C extends WController {
    constructor () { super(); this.got = [] }
    tkPingDispatched (payload) { this.got.push(payload) }
    step () {}
    draw () {}
  }
  const c = new C()
  c.listen('tkPing')
  const leaks = {...$global.memoryLeak}
  c.defer('tkPing', 1)
  c.schedule('tkPing', 2, 10, {id: 'ping'})
  c.schedule('tkPing', 3, 60000, {id: 'later'})
  c.setAnimationFrame('step', 'draw')
  assert('counted', $global.memoryLeak.microtasks === leaks.microtasks + 1 &&
    $global.memoryLeak.scheduledTasks === leaks.scheduledTasks + 2 && $global.memoryLeak.animationframe === leaks.animationframe + 1)
  assert('the animation holds the kernel loop', kernelLoop.held)
  await new Promise(resolve => setTimeout(resolve, 80))
  assert('the microtask and the due task ran', c.got.join() === '1,2')
  assert('cancel() by id', c.cancel('later') === 1 && !kernelScheduler.has('later'))
  c.schedule('tkPing', 4, 60000)
  c.defer('tkPing', 5)
  c.release()
  const now = $global.memoryLeak
  assert('release() cancels tasks and the animation', now.microtasks === leaks.microtasks &&
    now.scheduledTasks === leaks.scheduledTasks && now.animationframe === leaks.animationframe && !kernelLoop.held)
  assert('nothing left in the kernel queues', kernelTasks.size === 0)
  captureConsole()
  c.setAnimationFrame('missing')
  const lines = releaseConsole()
  assert('a missing method is reported', lines.some(l => l.includes("'missing'")) && !kernelLoop.held)
})

await describe('Tasks — setInterval() on the scheduler (deprecated)', async () => {
  class C extends WController {
    constructor () { super(); this.ticks = 0; this.stops = 0 }
    tick () { this.ticks++ }
    stopAtTwo () { if (++this.stops === 2) { this.clearInterval('stopAtTwo') } }
  }
  const c = new C()
  captureConsole()
  $global.debug.deprecated = true
  c.setInterval('tick', 20)
  $global.debug.deprecated = false
  const lines = releaseConsole()
  assert('reported as deprecated', lines.some(l => l.includes('C.setInterval is deprecated: use schedule()')))
  c.setInterval('stopAtTwo', 20)
  assert('a scheduled task per interval', kernelScheduler.has('rcInterval:tick') && kernelScheduler.has('rcInterval:stopAtTwo'))
  await new Promise(resolve => setTimeout(resolve, 150))
  assert('called repeatedly', c.ticks >= 3)
  assert('the method may stop its own interval', c.stops === 2 && !kernelScheduler.has('rcInterval:stopAtTwo'))
  await new Promise(resolve => setTimeout(resolve, 50))
  assert('the calls are not recorded in the logs', !$global.logs.events.some(e => e.event === 'rcInterval'))
  const leaks = $global.memoryLeak.setInterval
  c.release()
  const ticks = c.ticks
  await new Promise(resolve => setTimeout(resolve, 60))
  assert('release() stops it', c.ticks === ticks && $global.memoryLeak.setInterval === leaks - 1 && !kernelScheduler.has(/^rcInterval/))
})
