// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-media.mjs — open tests/browser/index.html in a browser
// The tools for games in a real browser: images loaded, a canvas scaled, a pointer converted, sounds decoded.

import {describe, assert, captureConsole, releaseConsole} from '../kernel.mjs'
import {loadImage, loadImages, SpriteAnimation} from '../../src/utils/sprites.mjs'
import {setupCanvas, canvasPoint} from '../../src/utils/canvas.mjs'
import {SoundBank} from '../../src/utils/sound.mjs'

const sandbox = document.getElementById('sandbox')
// a red image of 4 × 2 pixels, made by a canvas
const source = document.createElement('canvas')
source.width = 4
source.height = 2
source.getContext('2d').fillStyle = 'red'
source.getContext('2d').fillRect(0, 0, 4, 2)
const PNG = source.toDataURL('image/png')
// a sound of 0.01 s, silent (WAV, 8 bits, 8000 Hz)
const wav = () => {
  const samples = 80
  const buffer = new ArrayBuffer(44 + samples)
  const view = new DataView(buffer)
  const text = (offset, value) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, 36 + samples, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true)
  view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, samples, true)
  for (let i = 0; i < samples; i++) { view.setUint8(44 + i, 128) }
  return URL.createObjectURL(new Blob([buffer], {type: 'audio/wav'}))
}

await describe('Media — images, canvas, sounds', async () => {
  const image = await loadImage(PNG)
  assert('loadImage: ready to draw', image.width === 4 && image.complete)
  const images = await loadImages({a: PNG, b: PNG})
  assert('loadImages: by name', images.a.width === 4 && images.b.height === 2)
  let error = null
  try { await loadImage('/missing-image.png') } catch (e) { error = e }
  assert('a missing image: rejected', error instanceof Error && error.message.includes('missing-image'))

  const holder = document.createElement('div')
  holder.style.width = '300px'
  const canvas = document.createElement('canvas')
  holder.append(canvas)
  sandbox.append(holder)
  const view = setupCanvas(canvas, 1200, 600, {ratio: 1})
  const box = canvas.getBoundingClientRect()
  assert('the canvas fills its container, the proportions kept', Math.round(box.width) === 300 && Math.round(box.height) === 150)
  const p = canvasPoint(canvas, {clientX: box.left + 150, clientY: box.top + 75}, 1200, 600)
  assert('a pointer in the middle: the middle of the game', Math.round(p.x) === 600 && Math.round(p.y) === 300)
  view.reset()
  new SpriteAnimation({image, width: 2, height: 2, count: 2, scale: 10}).draw(view.ctx, 600, 300)
  const pixel = view.ctx.getImageData(600, 300, 1, 1).data
  assert('a frame drawn on the canvas', pixel[0] === 255 && pixel[3] === 255)
  holder.remove()

  const sounds = new SoundBank({blank: wav(), gone: '/missing-sound.wav'})
  captureConsole()
  await sounds.load()
  releaseConsole()
  assert('a sound decoded by the browser; a missing one left out', sounds.loaded.join() === 'blank')
  sounds.play('blank', {volume: 0.1})
  assert('played without error (silent here: no click yet)', true)
  const music = sounds.play('blank', {volume: 0.1, loop: true})
  music.stop()
  assert('a music played then stopped without error', music !== null)
})
