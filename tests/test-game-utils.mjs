// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-game-utils.mjs — node tests/run.mjs GameUtils
// The tools for games: overlaps of shapes, a canvas of fixed logical size, the animations cut from a sheet, the sounds
// (with a fake canvas, a fake context of drawing and a fake audio context).

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {circlesOverlap, rectsOverlap, circleRectOverlap, pointInCircle, pointInRect, bounceCircleOnRect} from '../src/utils/geometry.mjs'
import {setupCanvas, canvasPoint} from '../src/utils/canvas.mjs'
import {drawImageCentered, SpriteAnimation} from '../src/utils/sprites.mjs'
import {SoundBank} from '../src/utils/sound.mjs'

// a context of drawing that records its calls
const fakeContext = () => {
  const calls = []
  const ctx = {calls, imageSmoothingEnabled: true, fillStyle: ''}
  for (const name of ['setTransform', 'clearRect', 'fillRect', 'drawImage', 'save', 'restore', 'translate', 'rotate']) {
    ctx[name] = (...args) => calls.push([name, ...args])
  }
  return ctx
}

describe('GameUtils — overlaps', () => {
  const a = {x: 0, y: 0, radius: 10}
  assert('two circles', circlesOverlap(a, {x: 15, y: 0, radius: 6}) && !circlesOverlap(a, {x: 16, y: 0, radius: 6}))
  assert('circles that only touch: no overlap', !circlesOverlap(a, {x: 20, y: 0, radius: 10}))
  const r = {x: 0, y: 0, width: 10, height: 5}
  assert('two rectangles', rectsOverlap(r, {x: 9, y: 4, width: 3, height: 3}) && !rectsOverlap(r, {x: 10, y: 0, width: 3, height: 3}))
  assert('a circle and a rectangle', circleRectOverlap({x: 13, y: 2, radius: 4}, r) && !circleRectOverlap({x: 14, y: 8, radius: 4}, r))
  assert('a circle whose centre is in the rectangle', circleRectOverlap({x: 5, y: 2, radius: 1}, r))
  assert('a point in a circle', pointInCircle({x: 6, y: 7}, a) && !pointInCircle({x: 8, y: 8}, a))
  assert('a point in a rectangle, edges included', pointInRect({x: 10, y: 5}, r) && !pointInRect({x: 10.1, y: 5}, r))
})

describe('GameUtils — bounce', () => {
  const brick = {x: 100, y: 100, width: 50, height: 20}
  const ball = (x, y, vx, vy) => ({x, y, radius: 10, vx, vy})
  const away = ball(125, 80, 0.1, 0.3)
  assert('apart: nothing', bounceCircleOnRect(away, brick) === null && away.x === 125 && away.y === 80 && away.vy === 0.3)
  const down = ball(125, 94, 0.1, 0.3)
  assert('coming down on the top: back up, out by as much as it went in', bounceCircleOnRect(down, brick) === 'top' && down.vy === -0.3 &&
    down.vx === 0.1 && down.y === 86)
  const up = ball(120, 125, -0.2, -0.3)
  assert('going up into the bottom', bounceCircleOnRect(up, brick) === 'bottom' && up.vy === 0.3 && up.y === 135)
  const right = ball(95, 110, 0.3, 0.05)
  assert('going right into the left side', bounceCircleOnRect(right, brick) === 'left' && right.vx === -0.3 && right.x === 85 && right.vy === 0.05)
  const left = ball(155, 112, -0.3, 0)
  assert('going left, horizontally, into the right side', bounceCircleOnRect(left, brick) === 'right' && left.vx === 0.3 && left.x === 165)
  const straight = ball(125, 95, 0, 0.3)
  assert('straight down', bounceCircleOnRect(straight, brick) === 'top' && straight.vy === -0.3)
  const wall = {x: -500, y: 0, width: 500, height: 600}
  const edge = ball(5, 300, -0.3, 0.2)
  assert('a wall: a wide rectangle out of the field', bounceCircleOnRect(edge, wall) === 'right' && edge.vx === 0.3 && edge.x === 15)
})

describe('GameUtils — canvas', () => {
  const ctx = fakeContext()
  const canvas = {style: {}, getContext: (type, options) => { ctx.options = options; return ctx }}
  const view = setupCanvas(canvas, 1200, 600, {ratio: 2, alpha: false, smoothing: false})
  assert('the bitmap: logical size × ratio', canvas.width === 2400 && canvas.height === 1200 && view.width === 1200 && view.ratio === 2)
  assert('the size on the screen: CSS, the proportions kept', canvas.style.width === '100%' && canvas.style.height === 'auto' &&
    canvas.style.aspectRatio === '1200 / 600')
  assert('the options of the context', ctx.options.alpha === false && ctx.imageSmoothingEnabled === false)
  ctx.calls.length = 0
  view.reset('#000')
  assert('reset: the scale, then filled', JSON.stringify(ctx.calls) === JSON.stringify([['setTransform', 2, 0, 0, 2, 0, 0], ['fillRect', 0, 0, 1200, 600]]) &&
    ctx.fillStyle === '#000')
  ctx.calls.length = 0
  view.reset()
  assert('reset without colour: cleared', ctx.calls[1][0] === 'clearRect')
  const element = {getBoundingClientRect: () => ({left: 10, top: 20, width: 600, height: 300})}
  const p = canvasPoint(element, {clientX: 310, clientY: 170}, 1200, 600)
  assert('a pointer: logical coordinates, whatever the scale', p.x === 600 && p.y === 300 && p.inside)
  assert('outside the canvas', !canvasPoint(element, {clientX: 5, clientY: 30}, 1200, 600).inside)
})

describe('GameUtils — sprites', () => {
  const ctx = fakeContext()
  const image = {width: 40, height: 20}
  drawImageCentered(ctx, image, 100, 50)
  assert('centred, without rotation', JSON.stringify(ctx.calls[0]) === JSON.stringify(['drawImage', image, 80, 40, 40, 20]))
  ctx.calls.length = 0
  drawImageCentered(ctx, image, 100, 50, {angle: 1, width: 20, height: 40, pivotY: 0.75})
  assert('turned around a pivot, the state kept', ctx.calls.map(c => c[0]).join() === 'save,translate,rotate,drawImage,restore' &&
    JSON.stringify(ctx.calls[3].slice(2)) === JSON.stringify([-10, -30, 20, 40]))
  const loop = new SpriteAnimation({image, width: 8, height: 8, count: 3, period: 20, scale: 3, row: 1})
  loop.update(19)
  assert('a frame lasts a period', loop.frame === 0)
  loop.update(2)
  assert('then the next', loop.frame === 1)
  loop.update(45)
  assert('several periods at once: in a loop', loop.frame === 0 && !loop.done)
  ctx.calls.length = 0
  loop.draw(ctx, 50, 60)
  assert('drawn: its frame and row in the sheet, scaled, centred', JSON.stringify(ctx.calls[0].slice(2)) === JSON.stringify([0, 8, 8, 8, 38, 48, 24, 24]))
  const once = new SpriteAnimation({image, width: 8, height: 8, count: 3, period: 10, loop: false})
  once.update(25)
  assert('once: the last frame', once.frame === 2 && !once.done)
  once.update(10)
  ctx.calls.length = 0
  once.draw(ctx, 0, 0)
  assert('then done, nothing drawn', once.done && ctx.calls.length === 0)
  once.restart()
  assert('restart', !once.done && once.frame === 0)
  const custom = new SpriteAnimation({image, width: 8, height: 8, frames: [0, 2, 1], period: 10})
  custom.update(10)
  assert('an order of frames', custom.frame === 2)
})

// an audio context that records the sounds played
const fakeAudio = () => {
  const played = []
  const context = {
    state: 'suspended',
    resumed: 0,
    destination: {},
    resume () { this.resumed++; this.state = 'running'; return Promise.resolve() },
    decodeAudioData: async data => ({decoded: new TextDecoder().decode(data)}),
    createGain: () => ({gain: {value: 1}, connect: node => node}),
    createBufferSource: () => {
      const source = {connect: gain => { source.gain = gain; return gain }, start: () => played.push(source), stop: () => { source.stopped = true }}
      return source
    }
  }
  return {context, played}
}

await describe('GameUtils — sounds', async () => {
  const fetched = []
  globalThis.fetch = async url => {
    fetched.push(url)
    if (url.includes('missing')) { return {ok: false, status: 404} }
    return {ok: true, arrayBuffer: async () => new TextEncoder().encode(url).buffer}
  }
  const {context, played} = fakeAudio()
  const cache = new Map()
  const bank = new SoundBank({shot: '/a/shot.wav', boom: '/a/boom.mp3', gone: '/a/missing.wav'}, {context, cache})
  captureConsole()
  await bank.load()
  releaseConsole()
  assert('loaded and decoded; a missing sound is left out', bank.loaded.sort().join() === 'boom,shot' && fetched.length === 3)
  const again = new SoundBank({shot: '/a/shot.wav'}, {context, cache})
  await again.load()
  assert('a sound already loaded for the page is not fetched again', fetched.length === 3 && again.loaded.join() === 'shot')
  bank.unlock()
  assert('unlock: the context resumed', context.state === 'running' && context.resumed === 1)
  bank.play('shot', {volume: 0.25})
  assert('played: its buffer, its volume', played.length === 1 && played[0].buffer.decoded === '/a/shot.wav' && played[0].gain.gain.value === 0.25)
  assert('a sound: not repeated', played[0].loop === false)
  assert('a sound not loaded: silent, nothing returned', bank.play('gone') === null && bank.play('unknown') === null && played.length === 1)
  const music = bank.play('boom', {loop: true})
  assert('a music: repeated until stopped', played.length === 2 && played[1].loop === true && typeof music.stop === 'function')
  music.stop()
  assert('its own stop: only this sound', played[1].stopped === true && played[0].stopped === undefined)
  music.stop()
  assert('stopped twice: no error', true)
  bank.muted = true
  bank.play('boom')
  assert('muted: silent', played.length === 2)
  bank.muted = false
  bank.play('boom')
  bank.stop()
  assert('stop: the sounds being played are stopped', played.at(-1).stopped === true)
})
