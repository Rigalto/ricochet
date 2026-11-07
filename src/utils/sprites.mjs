// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The images of a game: loading them before the game starts, drawing one centred on a point (turned, scaled), and the
 * animations cut from a sheet of frames.
 *
 * ```javascript
 * import {loadImages, drawImageCentered, SpriteAnimation} from 'ricochet/ricochet-utils.mjs'
 *
 * const images = await loadImages({ship: '/assets/game/ship.png', boom: '/assets/game/explosion-128x128.png'})
 * drawImageCentered(ctx, images.ship, x, y, {angle: 0.3})
 *
 * const boom = new SpriteAnimation({image: images.boom, width: 128, height: 128, count: 21, period: 20, loop: false})
 * boom.update(dt)            // at each update of the game
 * boom.draw(ctx, x, y)       // at each render
 * if (boom.done) { … }       // played once
 * ```
 *
 * ## A sheet of frames
 *
 * The frames of an animation are side by side in one image, all of the same size, without any space: frame `i` is at
 * `x = i × width`. Several animations may share a sheet, one per row (`row`). The frames are shown in turn
 * (`count` frames), or in the order of `frames` (`[0, 1, 2, 1]`), each one during `period` milliseconds; in a loop,
 * or once (`loop: false`: then `done`, and nothing is drawn any more).
 *
 * @module sprites
 */

/**
 * Loads an image, and waits until it can be drawn.
 * @param {string} src - The address.
 * @returns {Promise<HTMLImageElement>} The image; rejected when it cannot be loaded.
 */
export const loadImage = src => {
  const image = new Image()
  image.src = src
  return image.decode().then(() => image, () => Promise.reject(new Error(`The image cannot be loaded: ${src}`)))
}

/**
 * Loads several images at once.
 * @param {Object<string, string>} sources - `{name: address}`.
 * @returns {Promise<Object<string, HTMLImageElement>>} `{name: image}`, once all are loaded; rejected when one cannot
 *   be loaded.
 */
export const loadImages = async sources => {
  const entries = await Promise.all(Object.entries(sources).map(async ([name, src]) => [name, await loadImage(src)]))
  return Object.fromEntries(entries)
}

/**
 * Draws an image centred on a point, turned and scaled. The state of the context (transformation) is kept.
 * @param {CanvasRenderingContext2D} ctx - The context.
 * @param {CanvasImageSource} image - The image.
 * @param {number} x - The centre.
 * @param {number} y - The centre.
 * @param {object} [options]
 * @param {number} [options.angle] - The rotation, in radians, around the centre (default 0).
 * @param {number} [options.width] - The width drawn (default: the width of the image).
 * @param {number} [options.height] - The height drawn (default: the height of the image).
 * @param {number} [options.pivotY] - The vertical position of the centre in the image, from 0 (top) to 1 (bottom)
 *   (default 0.5): a barrel turns around its base with `pivotY: 0.8`.
 */
export const drawImageCentered = (ctx, image, x, y, {angle = 0, width = image.width, height = image.height, pivotY = 0.5} = {}) => {
  if (angle === 0) {
    ctx.drawImage(image, x - width / 2, y - height * pivotY, width, height)
    return
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(image, -width / 2, -height * pivotY, width, height)
  ctx.restore()
}

/**
 * An animation cut from a sheet of frames.
 */
export class SpriteAnimation {
  /**
   * @param {object} options
   * @param {CanvasImageSource} options.image - The sheet.
   * @param {number} options.width - The width of a frame in the sheet.
   * @param {number} options.height - The height of a frame in the sheet.
   * @param {number} [options.count] - The number of frames (default 1).
   * @param {number[]} [options.frames] - The order of the frames (default: 0 to `count - 1`).
   * @param {number} [options.row] - The row of the animation in the sheet (default 0).
   * @param {number} [options.period] - The time of a frame, in ms (default 150).
   * @param {boolean} [options.loop] - In a loop (default `true`), or once.
   * @param {number} [options.scale] - The size drawn, relative to the frame (default 1).
   */
  constructor ({image, width, height, count = 1, frames = null, row = 0, period = 150, loop = true, scale = 1}) {
    this.image = image
    this.width = width
    this.height = height
    this.frames = frames ?? Array.from({length: count}, (_, i) => i)
    this.row = row
    this.period = period
    this.loop = loop
    this.scale = scale
    this.restart()
  }

  /** Starts again from the first frame. */
  restart () {
    this.index = 0 // the position in `frames`
    this.time = 0 // the time spent on the current frame
    this.done = false
  }

  /** The frame shown (its number in the sheet). */
  get frame () { return this.frames[this.index] }

  /**
   * Advances the animation.
   * @param {number} dt - The time spent, in ms.
   */
  update (dt) {
    if (this.done) { return }
    this.time += dt
    while (this.time >= this.period) {
      this.time -= this.period
      if (this.index < this.frames.length - 1) {
        this.index++
      } else if (this.loop) {
        this.index = 0
      } else {
        this.done = true
        return
      }
    }
  }

  /**
   * Draws the frame shown, centred on a point (nothing once a single animation is done).
   * @param {CanvasRenderingContext2D} ctx - The context.
   * @param {number} x - The centre.
   * @param {number} y - The centre.
   * @param {{angle: number}} [options] - The rotation, in radians.
   */
  draw (ctx, x, y, {angle = 0} = {}) {
    if (this.done) { return }
    const w = this.width * this.scale
    const h = this.height * this.scale
    const sx = this.frame * this.width
    const sy = this.row * this.height
    if (angle === 0) {
      ctx.drawImage(this.image, sx, sy, this.width, this.height, x - w / 2, y - h / 2, w, h)
      return
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.drawImage(this.image, sx, sy, this.width, this.height, -w / 2, -h / 2, w, h)
    ctx.restore()
  }
}
