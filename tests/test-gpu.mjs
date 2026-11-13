// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-gpu.mjs — node tests/run.mjs Gpu
// WebGPU, with a fake `navigator.gpu`: the shared device, the reasons when there is none, the loss of the device,
// the buffers and the canvases.

import {describe, assert} from './kernel.mjs'
import {requestGpu, resetGpu, gpuBuffer, configureCanvas} from '../src/utils/gpu.mjs'

globalThis.GPUBufferUsage = {MAP_READ: 1, MAP_WRITE: 2, COPY_SRC: 4, COPY_DST: 8, INDEX: 16, VERTEX: 32, UNIFORM: 64, STORAGE: 128}

// a fake browser: `adapter` (false: none), `refuse` (number of refused devices)
const fakeGpu = ({adapter = true, refuse = 0} = {}) => {
  const calls = {adapter: 0, device: 0, buffers: [], writes: []}
  let lose = null
  const device = {
    lost: new Promise(resolve => { lose = resolve }),
    createBuffer: descriptor => { calls.buffers.push(descriptor); return {descriptor} },
    queue: {writeBuffer: (buffer, offset, data) => calls.writes.push({buffer, offset, data})}
  }
  const gpu = {
    requestAdapter: async () => {
      calls.adapter += 1
      return adapter ? {requestDevice: async () => { calls.device += 1; if (calls.device <= refuse) { throw new Error('refused') } return device }} : null
    },
    getPreferredCanvasFormat: () => 'rgba8unorm'
  }
  Object.defineProperty(globalThis.navigator, 'gpu', {value: gpu, configurable: true})
  return {calls, device, lose: () => lose({reason: 'unknown'})}
}
const noGpu = () => { delete globalThis.navigator.gpu }
const tick = () => new Promise(resolve => setTimeout(resolve, 0))

noGpu()
resetGpu()
const unsupported = await requestGpu()

let fake = fakeGpu({adapter: false})
resetGpu()
const noAdapter = await requestGpu()

fake = fakeGpu({refuse: 1})
resetGpu()
const refused = await requestGpu()
const retried = await requestGpu()

fake = fakeGpu()
resetGpu()
const [first, second] = await Promise.all([requestGpu(), requestGpu()])
const third = await requestGpu()
const askedOnce = fake.calls.adapter === 1
fake.lose()
await tick()
const afterLoss = await requestGpu()

describe('Gpu — the device', () => {
  assert('no navigator.gpu: unsupported', unsupported.error === 'unsupported' && unsupported.device === null)
  assert('no adapter: adapter', noAdapter.error === 'adapter' && noAdapter.device === null)
  assert('a refused device: device, with the message', refused.error === 'device' && refused.message === 'refused')
  assert('a refused device: asked again', retried.error === null && retried.device !== null)
  assert('the device and the preferred format', first.error === null && first.device === fake.device && first.format === 'rgba8unorm')
  assert('one request for every caller', first === second && second === third && askedOnce)
  assert('a lost device: asked again', afterLoss !== first && fake.calls.adapter === 2)
})

describe('Gpu — buffers', () => {
  const device = fake.device
  const data = new Uint32Array([1, 2, 3])
  const filled = gpuBuffer(device, {label: 'Cells', usage: ['storage'], data})
  assert('size, label, usage with copy-dst', filled.descriptor.size === 12 && filled.descriptor.label === 'Cells' && filled.descriptor.usage === (128 | 8))
  assert('written', fake.calls.writes.at(-1).buffer === filled && fake.calls.writes.at(-1).data === data)
  const writes = fake.calls.writes.length
  const empty = gpuBuffer(device, {usage: 'uniform', size: 6})
  assert('rounded to 4 bytes, not written', empty.descriptor.size === 8 && empty.descriptor.usage === 64 && fake.calls.writes.length === writes)
  const flags = gpuBuffer(device, {usage: 32 | 8, size: 0})
  assert('numeric flags, 4 bytes at least', flags.descriptor.usage === 40 && flags.descriptor.size === 4)
  let error = ''
  try { gpuBuffer(device, {usage: ['storage', 'unknown'], size: 4}) } catch (e) { error = e.message }
  assert('an unknown usage', error.includes('unknown'))
})

describe('Gpu — canvas', () => {
  let configured = null
  const canvas = {getContext: type => type === 'webgpu' ? {configure: options => { configured = options }} : null}
  const result = configureCanvas(canvas, fake.device)
  assert('configured, preferred format, opaque', result.format === 'rgba8unorm' && configured.device === fake.device && configured.alphaMode === 'opaque')
  configureCanvas(canvas, fake.device, {format: 'bgra8unorm', alphaMode: 'premultiplied'})
  assert('chosen format and alpha', configured.format === 'bgra8unorm' && configured.alphaMode === 'premultiplied')
  assert('no context: null', configureCanvas({getContext: () => null}, fake.device) === null)
})

noGpu()
resetGpu()
