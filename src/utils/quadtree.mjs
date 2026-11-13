// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * A quadtree of points: a rectangle split into four when it holds too many points, and so on. A search only opens
 * the rectangles that meet it: suited to points gathered in a few places, and to searches of very different sizes.
 *
 * ```javascript
 * import {QuadTree} from 'ricochet/ricochet-utils.mjs'
 *
 * const tree = new QuadTree({x: 0, y: 0, width: 800, height: 600}, {capacity: 8})
 * tree.build(positions, {count: 1000, stride: 4})     // or tree.insert(index, x, y), one by one
 * tree.queryCircle(x, y, 50, (index, dx, dy, d2) => { … })
 * tree.queryRect(0, 0, 100, 100, (index, x, y) => { … })
 * tree.forEachNode((x, y, width, height, depth) => ctx.strokeRect(x, y, width, height))
 * ```
 *
 * A point keeps its index: the tree stores indexes and coordinates, the application keeps its own data. For points
 * spread over the area and searches of about the same radius, the [grid](spatial-grid.module.md) is simpler and
 * faster to rebuild.
 *
 * @module quadtree
 */

const makeNode = (x, y, width, height, depth) => ({x, y, width, height, depth, points: [], children: null})

/**
 * A quadtree of points (an index and its coordinates).
 */
export class QuadTree {
  /**
   * @param {{x: number, y: number, width: number, height: number}} bounds - The area: the points outside are refused.
   * @param {object} [options]
   * @param {number} [options.capacity] - The points of a rectangle before it is split (default 8).
   * @param {number} [options.maxDepth] - The maximum number of splits (default 8): the deepest rectangles keep all
   *   their points.
   */
  constructor ({x = 0, y = 0, width, height}, {capacity = 8, maxDepth = 8} = {}) {
    this.bounds = {x, y, width, height}
    this.capacity = capacity
    this.maxDepth = maxDepth
    this.clear()
  }

  /** Removes all the points. */
  clear () {
    const {x, y, width, height} = this.bounds
    this.root = makeNode(x, y, width, height, 0)
    this.size = 0
  }

  /**
   * Adds a point.
   * @param {number} index - Its index, given back by the searches.
   * @param {number} x - Its abscissa.
   * @param {number} y - Its ordinate.
   * @returns {boolean} `false` when the point is out of the area.
   */
  insert (index, x, y) {
    const {x: bx, y: by, width, height} = this.bounds
    if (x < bx || y < by || x > bx + width || y > by + height) { return false }
    let node = this.root
    for (;;) {
      if (node.children === null) {
        node.points.push(index, x, y)
        if (node.points.length / 3 > this.capacity && node.depth < this.maxDepth) { this.#split(node) }
        this.size += 1
        return true
      }
      node = this.#child(node, x, y)
    }
  }

  /**
   * Empties the tree and adds the points of an array.
   * @param {ArrayLike<number>} points - The coordinates: x at `stride × i`, y at `stride × i + 1`.
   * @param {object} [options]
   * @param {number} [options.count] - The number of points (default: all those of the array).
   * @param {number} [options.stride] - The numbers per point (default 2).
   */
  build (points, {count, stride = 2} = {}) {
    this.clear()
    const total = count ?? Math.floor(points.length / stride)
    for (let i = 0; i < total; i++) { this.insert(i, points[i * stride], points[i * stride + 1]) }
  }

  // the child that holds (x, y)
  #child (node, x, y) {
    const right = x >= node.x + node.width / 2 ? 1 : 0
    const bottom = y >= node.y + node.height / 2 ? 2 : 0
    return node.children[right + bottom]
  }

  #split (node) {
    const w = node.width / 2
    const h = node.height / 2
    const d = node.depth + 1
    node.children = [makeNode(node.x, node.y, w, h, d), makeNode(node.x + w, node.y, w, h, d),
      makeNode(node.x, node.y + h, w, h, d), makeNode(node.x + w, node.y + h, w, h, d)]
    const points = node.points
    node.points = []
    for (let k = 0; k < points.length; k += 3) {
      const child = this.#child(node, points[k + 1], points[k + 2])
      child.points.push(points[k], points[k + 1], points[k + 2])
    }
    for (const child of node.children) {
      if (child.points.length / 3 > this.capacity && child.depth < this.maxDepth) { this.#split(child) }
    }
  }

  // visits the leaves that meet the rectangle
  #leaves (x, y, width, height, visit) {
    const stack = [this.root]
    while (stack.length > 0) {
      const node = stack.pop()
      if (node.x > x + width || node.y > y + height || node.x + node.width < x || node.y + node.height < y) { continue }
      if (node.children === null) {
        visit(node)
      } else {
        stack.push(...node.children)
      }
    }
  }

  /**
   * Calls `callback` for each point in a rectangle (edges included).
   * @param {number} x - The left of the rectangle.
   * @param {number} y - Its top.
   * @param {number} width - Its width.
   * @param {number} height - Its height.
   * @param {(index: number, x: number, y: number) => void} callback - For each point.
   */
  queryRect (x, y, width, height, callback) {
    this.#leaves(x, y, width, height, node => {
      const p = node.points
      for (let k = 0; k < p.length; k += 3) {
        if (p[k + 1] >= x && p[k + 1] <= x + width && p[k + 2] >= y && p[k + 2] <= y + height) { callback(p[k], p[k + 1], p[k + 2]) }
      }
    })
  }

  /**
   * Calls `callback` for each point within `radius` of (x, y).
   * @param {number} x - The abscissa of the centre.
   * @param {number} y - Its ordinate.
   * @param {number} radius - The radius.
   * @param {(index: number, dx: number, dy: number, d2: number) => void} callback - For each point: its index, the
   *   gap from the centre to the point, the square of the distance.
   */
  queryCircle (x, y, radius, callback) {
    const r2 = radius * radius
    this.#leaves(x - radius, y - radius, 2 * radius, 2 * radius, node => {
      const p = node.points
      for (let k = 0; k < p.length; k += 3) {
        const dx = p[k + 1] - x
        const dy = p[k + 2] - y
        const d2 = dx * dx + dy * dy
        if (d2 <= r2) { callback(p[k], dx, dy, d2) }
      }
    })
  }

  /**
   * Calls `callback` for each rectangle of the tree (to draw it, or to measure it).
   * @param {(x: number, y: number, width: number, height: number, depth: number, count: number) => void} callback -
   *   For each rectangle: its position, its size, its depth and its number of points (0 for a split rectangle).
   */
  forEachNode (callback) {
    const stack = [this.root]
    while (stack.length > 0) {
      const node = stack.pop()
      callback(node.x, node.y, node.width, node.height, node.depth, node.points.length / 3)
      if (node.children !== null) { stack.push(...node.children) }
    }
  }
}
