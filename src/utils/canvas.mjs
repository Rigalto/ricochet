// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A canvas with a fixed logical size (a game of 1200 × 600, say), scaled by CSS to the width of its container, and
 * sharp on a high density screen; and the conversion of a pointer event into logical coordinates.
 *
 * ```javascript
 * import {setupCanvas, canvasPoint} from 'ricochet/ricochet-utils.mjs'
 *
 * const view = setupCanvas(element, 1200, 600)    // element: a <canvas>
 * view.reset()                                       // at each frame: logical coordinates, cleared
 * view.ctx.drawImage(image, 100, 50)                 // the native context, in logical pixels
 * element.addEventListener('pointerdown', e => {
 *   const {x, y} = canvasPoint(element, e, 1200, 600) // logical coordinates, whatever the scale
 * })
 * ```
 *
 * The game draws with the native 2D context: no wrapper, the methods of the browser are the reference.
 *
 * ## The size
 *
 * - **Logical size**: the coordinates of the game (`width` × `height`). The drawing does not depend on the size of the
 *   screen.
 * - **Size on the screen**: CSS. `setupCanvas()` gives the canvas `width: 100%`, `height: auto` and the
 *   `aspect-ratio` of the logical size: it fills its container and keeps its proportions. A `max-width` given by
 *   the application keeps it from growing beyond its logical size.
 * - **Sharpness**: the bitmap of the canvas has `width × ratio` pixels (`ratio`: `devicePixelRatio` by default,
 *   bounded to 2); `reset()` sets the scale, so that the game keeps drawing in logical pixels.
 *
 * @module canvas
 */

/**
 * Prepares a canvas for a fixed logical size.
 * @param {HTMLCanvasElement} canvas - The canvas.
 * @param {number} width - The logical width.
 * @param {number} height - The logical height.
 * @param {object} [options]
 * @param {number} [options.ratio] - Bitmap pixels per logical pixel (default: `devicePixelRatio`, between 1 and 2).
 * @param {boolean} [options.alpha] - A transparent canvas (default `true`: the CSS background shows through).
 * @param {boolean} [options.smoothing] - The smoothing of the images (default `true`; `false` for pixel art).
 * @returns {{ctx: CanvasRenderingContext2D, width: number, height: number, ratio: number, reset: Function}} The 2D
 *   context, the logical size, the ratio, and `reset(fill)`: back to logical coordinates (no rotation, no
 *   translation), the whole canvas cleared, or filled with the colour `fill`.
 */
export const setupCanvas = (canvas, width, height, {ratio, alpha = true, smoothing = true} = {}) => {
  const scale = ratio ?? Math.min(2, Math.max(1, globalThis.devicePixelRatio ?? 1))
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.style.width = '100%'
  canvas.style.height = 'auto'
  canvas.style.aspectRatio = `${width} / ${height}`
  const ctx = canvas.getContext('2d', {alpha})
  ctx.imageSmoothingEnabled = smoothing
  const reset = fill => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    if (fill === undefined) {
      ctx.clearRect(0, 0, width, height)
    } else {
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, width, height)
    }
  }
  reset()
  return {ctx, width, height, ratio: scale, reset}
}

/**
 * The logical coordinates of a pointer event (or of any `{clientX, clientY}`) on a canvas, whatever its size on the
 * screen.
 * @param {HTMLCanvasElement} canvas - The canvas.
 * @param {{clientX: number, clientY: number}} event - The event.
 * @param {number} width - The logical width.
 * @param {number} height - The logical height.
 * @returns {{x: number, y: number, inside: boolean}} The coordinates, and whether the point is on the canvas.
 */
export const canvasPoint = (canvas, event, width, height) => {
  const box = canvas.getBoundingClientRect()
  const x = box.width === 0 ? 0 : (event.clientX - box.left) * width / box.width
  const y = box.height === 0 ? 0 : (event.clientY - box.top) * height / box.height
  return {x, y, inside: x >= 0 && y >= 0 && x <= width && y <= height}
}
