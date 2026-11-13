# gpu

Module `gpu` · group `utils` · source [`src/utils/gpu.mjs`](../../src/utils/gpu.mjs)

WebGPU: the device shared by the page, the reason when there is none, and two shortcuts for buffers and canvases.
The shaders, the pipelines and the passes stay those of the browser: no wrapper, the WebGPU API is the reference.

```javascript
import {requestGpu, gpuBuffer, configureCanvas} from 'ricochet/ricochet-utils.mjs'

const gpu = await requestGpu()
if (gpu.error !== null) {
  showCpuVersion(gpu.error)                        // 'unsupported', 'adapter' or 'device'
} else {
  const cells = gpuBuffer(gpu.device, {label: 'Cells', usage: ['storage'], data: new Uint32Array(64 * 64)})
  const {context, format} = configureCanvas(canvas, gpu.device)
  // pipelines, bind groups and passes: the native API
}
```

## One device for the page

`requestGpu()` asks the browser for an adapter and a device once, and gives every caller the same answer: the
views that use the GPU share the device, and a view that comes back does not wait again. A component never calls
`device.destroy()`: it destroys its own buffers and textures (`buffer.destroy()`) when it is detached.

When the device is lost (driver reset, `destroy()` by mistake, tab in the background for long on some systems),
the next call of `requestGpu()` asks for a new one. A view that keeps running can watch `device.lost`.

## No GPU

The answer always has an `error`: `null` when the device is ready, otherwise the reason.

| `error` | Reason |
| --- | --- |
| `unsupported` | the browser has no WebGPU (`navigator.gpu` is missing: old browser, or a page not served over https) |
| `adapter` | the browser has WebGPU but gives no adapter (GPU not supported by the browser, as on many phones) |
| `device` | the adapter refused the device; the next call tries again |

The application then falls back on a version for the processor, or says why the view is not available.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `requestGpu` | function | The device of the page, asked for once and shared. |
| `resetGpu` | function | Forgets the device: the next `requestGpu()` asks for a new one. For the tests, and after a `device.destroy()`. |
| `gpuBuffer` | function | Creates a buffer, filled with `data` when it is given. The size is rounded up to a multiple of 4 bytes, as WebGPU requires; a buffer that receives `data` gets the usage `copy-dst`, to be written again with `device.queue.writeBuffer()`. |
| `configureCanvas` | function | Prepares a canvas for the drawing of the device. |

## Details

### requestGpu()

The device of the page, asked for once and shared.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | object |  |
| `options.powerPreference` | string | `high-performance` (default) or `low-power`; only the first call chooses. |

**Returns** `Promise<{error: string|null, adapter: object|null, device: object|null, format: string|null,
  message: string}>` `error`: `null`, `unsupported`, `adapter` or `device`; `format`: the preferred format of the
  canvases; `message`: the message of the browser, when it gave one.

### gpuBuffer()

Creates a buffer, filled with `data` when it is given. The size is rounded up to a multiple of 4 bytes, as WebGPU
requires; a buffer that receives `data` gets the usage `copy-dst`, to be written again with
`device.queue.writeBuffer()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `device` | object | The device (`GPUDevice`). |
| `options` | object |  |
| `options.label` | string | The name shown in the errors of the browser. |
| `options.usage` | number\|string\|string[] | The flags (`GPUBufferUsage`), or their names: `storage`, `uniform`, `vertex`, `index`, `copy-src`, `copy-dst`, `map-read`… |
| `options.data` | ArrayBufferView\|ArrayBuffer | The content. |
| `options.size` | number | The size in bytes, without `data`. |

**Returns** `object` The buffer (`GPUBuffer`).

### configureCanvas()

Prepares a canvas for the drawing of the device.

| Parameter | Type | Description |
| --- | --- | --- |
| `canvas` | HTMLCanvasElement | The canvas. |
| `device` | object | The device (`GPUDevice`). |
| `options` | object |  |
| `options.format` | string | The format of the texture (default: the preferred format of the browser). |
| `options.alphaMode` | string | `opaque` (default) or `premultiplied`, for a canvas that lets the page show through. |

**Returns** `{context: object, format: string}|null` The context (`GPUCanvasContext`) and the format, or `null` when
  the canvas gives no WebGPU context.
