// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The neighbours of a point among thousands, without comparing every pair: the points are sorted into the cells of
 * a grid, and a search only visits the cells around the point. Rebuilt at each frame for moving points (a flock, a
 * swarm of particles, the enemies near the player), in typed arrays: nothing is allocated by a rebuild.
 *
 * ```javascript
 * import {SpatialGrid} from 'ricochet/ricochet-utils.mjs'
 *
 * const grid = new SpatialGrid({width: 800, height: 600, cellSize: 50, wrap: true})
 * grid.build(positions, {count: 1000, stride: 4})     // x at 4 i, y at 4 i + 1
 * grid.forEachNear(x, y, 50, (index, dx, dy, d2) => { … }, {exclude: i})
 * grid.nearest(x, y, 7, {exclude: i})                 // the 7 nearest, sorted
 * ```
 *
 * ## The cells
 *
 * The cells are at least `cellSize` wide: a search within `cellSize` visits the 3 × 3 cells around the point. Take
 * the largest search radius as `cellSize`; a larger radius still works, by visiting more cells.
 *
 * ## The wrapped area
 *
 * With `wrap`, the right edge touches the left edge and the bottom touches the top (a torus): a point near an edge
 * finds its neighbours on the other side, and `dx`, `dy` are the shortest way, through the edge if it is shorter.
 *
 * ## Grid or quadtree
 *
 * The grid suits points spread over the area and searches of about the same radius: it is the simplest and the
 * fastest to rebuild. The [quadtree](quadtree.module.md) suits points gathered in a few places, or searches of very
 * different sizes.
 *
 * @module spatial-grid
 */

/**
 * A grid of cells for the search of neighbours.
 */
export class SpatialGrid {
  /**
   * @param {object} options
   * @param {number} options.width - The width of the area (from 0).
   * @param {number} options.height - Its height (from 0).
   * @param {number} options.cellSize - The minimum side of a cell: the usual search radius.
   * @param {boolean} [options.wrap] - A wrapped area (torus).
   */
  constructor ({width, height, cellSize, wrap = false}) {
    this.width = width
    this.height = height
    this.wrap = wrap
    this.cellSize = cellSize
    this.cols = Math.max(1, Math.floor(width / cellSize))
    this.rows = Math.max(1, Math.floor(height / cellSize))
    this.cellWidth = width / this.cols
    this.cellHeight = height / this.rows
    const cells = this.cols * this.rows
    this.starts = new Uint32Array(cells + 1) // the points of cell c: items[starts[c]] to items[starts[c + 1] - 1]
    this.items = new Uint32Array(0)
    this.cellOfItem = new Uint32Array(0)
    this.stamps = new Uint32Array(cells) // the cells visited by the current search
    this.stamp = 0
    this.points = null
    this.stride = 2
    this.count = 0
  }

  // the cell of a point (the points out of the area go to the nearest cell)
  #cell (x, y) {
    const col = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellWidth)))
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellHeight)))
    return row * this.cols + col
  }

  /**
   * Sorts the points into the cells. The array is kept, not copied: rebuild after moving the points.
   * @param {ArrayLike<number>} points - The coordinates: x at `stride × i`, y at `stride × i + 1`.
   * @param {object} [options]
   * @param {number} [options.count] - The number of points (default: all those of the array).
   * @param {number} [options.stride] - The numbers per point (default 2).
   */
  build (points, {count, stride = 2} = {}) {
    const total = count ?? Math.floor(points.length / stride)
    this.points = points
    this.stride = stride
    this.count = total
    if (this.items.length < total) {
      this.items = new Uint32Array(total)
      this.cellOfItem = new Uint32Array(total)
    }
    const starts = this.starts
    starts.fill(0)
    for (let i = 0; i < total; i++) {
      const cell = this.#cell(points[i * stride], points[i * stride + 1])
      this.cellOfItem[i] = cell
      starts[cell + 1] += 1
    }
    for (let c = 1; c < starts.length; c++) { starts[c] += starts[c - 1] }
    const next = starts.slice(0, starts.length - 1) // the next free place of each cell
    for (let i = 0; i < total; i++) { this.items[next[this.cellOfItem[i]]++] = i }
  }

  // the gap from (x, y) to a point, through the edge when it is shorter
  #gap (d, size) {
    if (!this.wrap) { return d }
    if (d > size / 2) { return d - size }
    if (d < -size / 2) { return d + size }
    return d
  }

  // visits the cells of the rectangle of cells [col - rx, col + rx] × [row - ry, row + ry], each once
  #visitCells (col, row, rx, ry, visit) {
    this.stamp += 1
    if (this.stamp === 0xffffffff) {
      this.stamps.fill(0)
      this.stamp = 1
    }
    for (let j = row - ry; j <= row + ry; j++) {
      let r = j
      if (this.wrap) {
        r = ((j % this.rows) + this.rows) % this.rows
      } else if (j < 0 || j >= this.rows) {
        continue
      }
      for (let i = col - rx; i <= col + rx; i++) {
        let c = i
        if (this.wrap) {
          c = ((i % this.cols) + this.cols) % this.cols
        } else if (i < 0 || i >= this.cols) {
          continue
        }
        const cell = r * this.cols + c
        if (this.stamps[cell] === this.stamp) { continue }
        this.stamps[cell] = this.stamp
        visit(cell)
      }
    }
  }

  /**
   * Calls `callback` for each point within `radius` of (x, y).
   * @param {number} x - The abscissa of the centre.
   * @param {number} y - Its ordinate.
   * @param {number} radius - The radius.
   * @param {(index: number, dx: number, dy: number, d2: number) => void} callback - For each point: its index, the
   *   gap from the centre to the point (through the edge when it is shorter), the square of the distance.
   * @param {object} [options]
   * @param {number} [options.exclude] - An index to skip (the point at the centre).
   */
  forEachNear (x, y, radius, callback, {exclude = -1} = {}) {
    const {points, stride, items, starts} = this
    const cell = this.#cell(x, y)
    const r2 = radius * radius
    const rx = Math.ceil(radius / this.cellWidth)
    const ry = Math.ceil(radius / this.cellHeight)
    this.#visitCells(cell % this.cols, Math.floor(cell / this.cols), rx, ry, c => {
      for (let k = starts[c]; k < starts[c + 1]; k++) {
        const index = items[k]
        if (index === exclude) { continue }
        const dx = this.#gap(points[index * stride] - x, this.width)
        const dy = this.#gap(points[index * stride + 1] - y, this.height)
        const d2 = dx * dx + dy * dy
        if (d2 <= r2) { callback(index, dx, dy, d2) }
      }
    })
  }

  /**
   * The indexes of the points within `radius` of (x, y), in no particular order.
   * @param {number} x - The abscissa of the centre.
   * @param {number} y - Its ordinate.
   * @param {number} radius - The radius.
   * @param {{exclude?: number}} [options] - An index to skip.
   * @returns {number[]} The indexes.
   */
  near (x, y, radius, options) {
    const found = []
    this.forEachNear(x, y, radius, index => found.push(index), options)
    return found
  }

  /**
   * The `k` nearest points of (x, y), from the nearest: the search widens ring by ring until no closer point can
   * remain.
   * @param {number} x - The abscissa of the centre.
   * @param {number} y - Its ordinate.
   * @param {number} k - The number of points.
   * @param {object} [options]
   * @param {number} [options.exclude] - An index to skip (the point at the centre).
   * @param {number} [options.maxRadius] - No point beyond this distance (default: none).
   * @returns {{index: number, dx: number, dy: number, d2: number}[]} At most `k` points, sorted by distance.
   */
  nearest (x, y, k, {exclude = -1, maxRadius = Infinity} = {}) {
    const best = []
    if (k <= 0 || this.count === 0) { return best }
    const {points, stride, items, starts} = this
    const max2 = maxRadius * maxRadius
    const cell = this.#cell(x, y)
    const col = cell % this.cols
    const row = Math.floor(cell / this.cols)
    const step = Math.min(this.cellWidth, this.cellHeight)
    const rings = Math.max(this.cols, this.rows)
    this.stamp += 1
    if (this.stamp === 0xffffffff) {
      this.stamps.fill(0)
      this.stamp = 1
    }
    const visit = c => {
      if (this.stamps[c] === this.stamp) { return }
      this.stamps[c] = this.stamp
      for (let n = starts[c]; n < starts[c + 1]; n++) {
        const index = items[n]
        if (index === exclude) { continue }
        const dx = this.#gap(points[index * stride] - x, this.width)
        const dy = this.#gap(points[index * stride + 1] - y, this.height)
        const d2 = dx * dx + dy * dy
        if (d2 > max2 || (best.length === k && d2 >= best[k - 1].d2)) { continue }
        let at = best.length === k ? k - 1 : best.length
        if (best.length < k) { best.push(null) }
        while (at > 0 && best[at - 1].d2 > d2) {
          best[at] = best[at - 1]
          at -= 1
        }
        best[at] = {index, dx, dy, d2}
      }
    }
    const cellAt = (i, j) => {
      if (this.wrap) {
        return (((j % this.rows) + this.rows) % this.rows) * this.cols + (((i % this.cols) + this.cols) % this.cols)
      }
      return i < 0 || j < 0 || i >= this.cols || j >= this.rows ? -1 : j * this.cols + i
    }
    for (let ring = 0; ring <= rings; ring++) {
      // the cells of this ring are at least (ring - 1) × step from the point
      const reach = Math.max(0, ring - 1) * step
      if (reach * reach > max2 || (best.length === k && reach * reach >= best[k - 1].d2)) { break }
      for (let i = col - ring; i <= col + ring; i++) {
        for (const j of ring === 0 ? [row] : [row - ring, row + ring]) {
          const c = cellAt(i, j)
          if (c >= 0) { visit(c) }
        }
      }
      for (let j = row - ring + 1; j <= row + ring - 1; j++) {
        for (const i of [col - ring, col + ring]) {
          const c = cellAt(i, j)
          if (c >= 0) { visit(c) }
        }
      }
    }
    return best
  }
}
