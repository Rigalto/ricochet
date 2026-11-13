// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * WebGPU: the device shared by the page, the reason when there is none, and two shortcuts for buffers and canvases.
 * The shaders, the pipelines and the passes stay those of the browser: no wrapper, the WebGPU API is the reference.
 *
 * ```javascript
 * import {requestGpu, gpuBuffer, configureCanvas} from 'ricochet/ricochet-utils.mjs'
 *
 * const gpu = await requestGpu()
 * if (gpu.error !== null) {
 *   showCpuVersion(gpu.error)                        // 'unsupported', 'adapter' or 'device'
 * } else {
 *   const cells = gpuBuffer(gpu.device, {label: 'Cells', usage: ['storage'], data: new Uint32Array(64 * 64)})
 *   const {context, format} = configureCanvas(canvas, gpu.device)
 *   // pipelines, bind groups and passes: the native API
 * }
 * ```
 *
 * ## One device for the page
 *
 * `requestGpu()` asks the browser for an adapter and a device once, and gives every caller the same answer: the
 * views that use the GPU share the device, and a view that comes back does not wait again. A component never calls
 * `device.destroy()`: it destroys its own buffers and textures (`buffer.destroy()`) when it is detached.
 *
 * When the device is lost (driver reset, `destroy()` by mistake, tab in the background for long on some systems),
 * the next call of `requestGpu()` asks for a new one. A view that keeps running can watch `device.lost`.
 *
 * ## No GPU
 *
 * The answer always has an `error`: `null` when the device is ready, otherwise the reason.
 *
 * | `error` | Reason |
 * | --- | --- |
 * | `unsupported` | the browser has no WebGPU (`navigator.gpu` is missing: old browser, or a page not served over https) |
 * | `adapter` | the browser has WebGPU but gives no adapter (GPU not supported by the browser, as on many phones) |
 * | `device` | the adapter refused the device; the next call tries again |
 *
 * The application then falls back on a version for the processor, or says why the view is not available.
 *
 * @module gpu
 */

let pending = null // the promise of the answer, shared by the callers

const answer = (error, adapter = null, device = null, format = null, message = '') => ({error, adapter, device, format, message})

const acquire = async powerPreference => {
  const gpu = globalThis.navigator?.gpu
  if (!gpu) { return answer('unsupported') }
  let adapter = null
  try {
    adapter = await gpu.requestAdapter({powerPreference})
  } catch (error) {
    return answer('adapter', null, null, null, error?.message ?? String(error))
  }
  if (!adapter) { return answer('adapter') }
  let device
  try {
    device = await adapter.requestDevice()
  } catch (error) {
    pending = null // a refused device may be granted later
    return answer('device', adapter, null, null, error?.message ?? String(error))
  }
  const current = pending
  device.lost?.then(() => {
    if (pending === current) { pending = null }
  })
  return answer(null, adapter, device, gpu.getPreferredCanvasFormat?.() ?? 'bgra8unorm')
}

/**
 * The device of the page, asked for once and shared.
 * @param {object} [options]
 * @param {string} [options.powerPreference] - `high-performance` (default) or `low-power`; only the first call
 *   chooses.
 * @returns {Promise<{error: string|null, adapter: object|null, device: object|null, format: string|null,
 *   message: string}>} `error`: `null`, `unsupported`, `adapter` or `device`; `format`: the preferred format of the
 *   canvases; `message`: the message of the browser, when it gave one.
 */
export const requestGpu = ({powerPreference = 'high-performance'} = {}) => {
  if (pending === null) { pending = acquire(powerPreference) }
  return pending
}

/**
 * Forgets the device: the next `requestGpu()` asks for a new one. For the tests, and after a `device.destroy()`.
 */
export const resetGpu = () => { pending = null }

const usageFlags = usage => {
  if (typeof usage === 'number') { return usage }
  const flags = globalThis.GPUBufferUsage
  return [usage].flat().reduce((sum, name) => {
    const flag = flags?.[name.toUpperCase().replaceAll('-', '_')]
    if (flag === undefined) { throw new Error(`gpuBuffer: unknown usage "${name}"`) }
    return sum | flag
  }, 0)
}

/**
 * Creates a buffer, filled with `data` when it is given. The size is rounded up to a multiple of 4 bytes, as WebGPU
 * requires; a buffer that receives `data` gets the usage `copy-dst`, to be written again with
 * `device.queue.writeBuffer()`.
 * @param {object} device - The device (`GPUDevice`).
 * @param {object} options
 * @param {string} [options.label] - The name shown in the errors of the browser.
 * @param {number|string|string[]} options.usage - The flags (`GPUBufferUsage`), or their names: `storage`,
 *   `uniform`, `vertex`, `index`, `copy-src`, `copy-dst`, `map-read`…
 * @param {ArrayBufferView|ArrayBuffer} [options.data] - The content.
 * @param {number} [options.size] - The size in bytes, without `data`.
 * @returns {object} The buffer (`GPUBuffer`).
 */
export const gpuBuffer = (device, {label = '', usage, data, size}) => {
  let flags = usageFlags(usage)
  if (data !== undefined) { flags |= globalThis.GPUBufferUsage?.COPY_DST ?? 0 }
  const bytes = data?.byteLength ?? size ?? 0
  const buffer = device.createBuffer({label, size: Math.max(4, Math.ceil(bytes / 4) * 4), usage: flags})
  if (data !== undefined) { device.queue.writeBuffer(buffer, 0, data) }
  return buffer
}

/**
 * Prepares a canvas for the drawing of the device.
 * @param {HTMLCanvasElement} canvas - The canvas.
 * @param {object} device - The device (`GPUDevice`).
 * @param {object} [options]
 * @param {string} [options.format] - The format of the texture (default: the preferred format of the browser).
 * @param {string} [options.alphaMode] - `opaque` (default) or `premultiplied`, for a canvas that lets the page
 *   show through.
 * @returns {{context: object, format: string}|null} The context (`GPUCanvasContext`) and the format, or `null` when
 *   the canvas gives no WebGPU context.
 */
export const configureCanvas = (canvas, device, {format, alphaMode = 'opaque'} = {}) => {
  const context = canvas.getContext('webgpu')
  if (!context) { return null }
  const chosen = format ?? globalThis.navigator?.gpu?.getPreferredCanvasFormat?.() ?? 'bgra8unorm'
  context.configure({device, format: chosen, alphaMode})
  return {context, format: chosen}
}
