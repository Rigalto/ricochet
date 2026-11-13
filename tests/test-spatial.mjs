// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-spatial.mjs — node tests/run.mjs Spatial
// The search of neighbours: the grid (SpatialGrid, with and without wrapped edges, within a radius and the k
// nearest) and the quadtree, compared with the comparison of every pair.

import {describe, assert} from './kernel.mjs'
import {Random} from '../src/utils/random.mjs'
import {SpatialGrid} from '../src/utils/spatial-grid.mjs'
import {QuadTree} from '../src/utils/quadtree.mjs'

const W = 300
const H = 200
const random = new Random(5)
const COUNT = 400
const STRIDE = 4 // x, y, and two other numbers, as in a set of particles
const points = new Float32Array(COUNT * STRIDE)
for (let i = 0; i < COUNT; i++) {
  points[i * STRIDE] = random.float(0, W)
  points[i * STRIDE + 1] = random.float(0, H)
}
// gathered points, for the quadtree
const cluster = new Float32Array(COUNT * 2)
for (let i = 0; i < COUNT; i++) {
  cluster[2 * i] = 40 + random.float(0, 20)
  cluster[2 * i + 1] = 30 + random.float(0, 20)
}

const gap = (d, size, wrap) => wrap ? d - size * Math.round(d / size) : d
// every pair: the indexes within the radius, and the k nearest
const bruteNear = (x, y, radius, wrap, exclude = -1, data = points, stride = STRIDE) => {
  const found = []
  for (let i = 0; i < data.length / stride; i++) {
    if (i === exclude) { continue }
    const dx = gap(data[i * stride] - x, W, wrap)
    const dy = gap(data[i * stride + 1] - y, H, wrap)
    if (dx * dx + dy * dy <= radius * radius) { found.push(i) }
  }
  return found.sort((a, b) => a - b)
}
const bruteNearest = (x, y, k, wrap, exclude) => {
  const all = []
  for (let i = 0; i < COUNT; i++) {
    if (i === exclude) { continue }
    const dx = gap(points[i * STRIDE] - x, W, wrap)
    const dy = gap(points[i * STRIDE + 1] - y, H, wrap)
    all.push(dx * dx + dy * dy)
  }
  return all.sort((a, b) => a - b).slice(0, k)
}
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
const close = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6)

describe('Spatial — the grid', () => {
  const grid = new SpatialGrid({width: W, height: H, cellSize: 25})
  assert('cells of at least cellSize', grid.cols === 12 && grid.rows === 8 && grid.cellWidth >= 25)
  grid.build(points, {count: COUNT, stride: STRIDE})
  let ok = true
  for (let i = 0; i < 60; i++) {
    const x = points[i * STRIDE]
    const y = points[i * STRIDE + 1]
    if (!same(grid.near(x, y, 25, {exclude: i}).sort((a, b) => a - b), bruteNear(x, y, 25, false, i))) { ok = false }
  }
  assert('within a radius: as every pair', ok)
  const far = grid.near(150, 100, 70).sort((a, b) => a - b)
  assert('a radius larger than the cells', same(far, bruteNear(150, 100, 70, false)))
  let gaps = true
  grid.forEachNear(10, 10, 25, (index, dx, dy, d2) => {
    if (Math.abs(points[index * STRIDE] - 10 - dx) > 1e-6 || Math.abs(dx * dx + dy * dy - d2) > 1e-6) { gaps = false }
  })
  assert('gaps and squared distance', gaps)
  assert('no wrap: nothing through the edge', same(grid.near(1, 1, 25).sort((a, b) => a - b), bruteNear(1, 1, 25, false)))
  const half = new SpatialGrid({width: W, height: H, cellSize: 25})
  half.build(points, {count: 100, stride: STRIDE})
  assert('a part of the array', half.near(150, 100, 500).length === 100)
})

describe('Spatial — the wrapped grid', () => {
  const grid = new SpatialGrid({width: W, height: H, cellSize: 30, wrap: true})
  grid.build(points, {count: COUNT, stride: STRIDE})
  let ok = true
  for (const [x, y] of [[1, 1], [299, 199], [150, 0.5], [0.5, 100], [150, 100]]) {
    if (!same(grid.near(x, y, 30).sort((a, b) => a - b), bruteNear(x, y, 30, true))) { ok = false }
  }
  assert('within a radius, through the edges', ok)
  let shortest = true
  grid.forEachNear(1, 1, 30, (index, dx) => { if (Math.abs(dx) > 30) { shortest = false } })
  assert('the gap through the edge', shortest)
  const small = new SpatialGrid({width: 60, height: 60, cellSize: 30, wrap: true})
  small.build(new Float32Array([10, 10, 50, 50]))
  assert('a radius over the whole area: each point once', small.near(30, 30, 200).length === 2)
})

describe('Spatial — the nearest', () => {
  for (const wrap of [false, true]) {
    const grid = new SpatialGrid({width: W, height: H, cellSize: 20, wrap})
    grid.build(points, {count: COUNT, stride: STRIDE})
    let ok = true
    let sorted = true
    for (let i = 0; i < 80; i++) {
      const found = grid.nearest(points[i * STRIDE], points[i * STRIDE + 1], 7, {exclude: i})
      if (!close(found.map(f => f.d2), bruteNearest(points[i * STRIDE], points[i * STRIDE + 1], 7, wrap, i))) { ok = false }
      if (found.some(f => f.index === i)) { ok = false }
      if (found.some((f, k) => k > 0 && f.d2 < found[k - 1].d2)) { sorted = false }
    }
    assert(`the 7 nearest (${wrap ? 'wrapped' : 'closed'}): as every pair`, ok && sorted)
  }
  const grid = new SpatialGrid({width: W, height: H, cellSize: 20})
  grid.build(points, {count: COUNT, stride: STRIDE})
  assert('fewer points than k', grid.nearest(0, 0, 1000).length === COUNT)
  assert('within maxRadius', grid.nearest(150, 100, 50, {maxRadius: 20}).every(f => f.d2 <= 400))
  const sparse = new SpatialGrid({width: W, height: H, cellSize: 10})
  sparse.build(new Float32Array([5, 5, 295, 195]))
  assert('far points: the search widens', sparse.nearest(6, 6, 2).map(f => f.index).join() === '0,1')
  assert('empty: nothing', new SpatialGrid({width: W, height: H, cellSize: 10}).nearest(1, 1, 3).length === 0)
})

describe('Spatial — the quadtree', () => {
  const tree = new QuadTree({x: 0, y: 0, width: W, height: H}, {capacity: 4, maxDepth: 6})
  tree.build(points, {count: COUNT, stride: STRIDE})
  assert('all the points', tree.size === COUNT)
  let ok = true
  for (let i = 0; i < 40; i++) {
    const x = points[i * STRIDE]
    const y = points[i * STRIDE + 1]
    const found = []
    tree.queryCircle(x, y, 25, index => { if (index !== i) { found.push(index) } })
    if (!same(found.sort((a, b) => a - b), bruteNear(x, y, 25, false, i))) { ok = false }
  }
  assert('within a radius: as every pair', ok)
  const inRect = []
  tree.queryRect(100, 50, 60, 40, (index, x, y) => inRect.push(index))
  const expected = []
  for (let i = 0; i < COUNT; i++) {
    const x = points[i * STRIDE]
    const y = points[i * STRIDE + 1]
    if (x >= 100 && x <= 160 && y >= 50 && y <= 90) { expected.push(i) }
  }
  assert('in a rectangle', same(inRect.sort((a, b) => a - b), expected))
  let nodes = 0
  let deepest = 0
  let stored = 0
  tree.forEachNode((x, y, w, h, depth, count) => {
    nodes += 1
    deepest = Math.max(deepest, depth)
    stored += count
  })
  assert('split, within maxDepth', nodes > 1 && deepest <= 6 && stored === COUNT)
  const gathered = new QuadTree({x: 0, y: 0, width: W, height: H}, {capacity: 8, maxDepth: 4})
  gathered.build(cluster)
  let maxDepth = 0
  gathered.forEachNode((x, y, w, h, depth) => { maxDepth = Math.max(maxDepth, depth) })
  const inCluster = []
  gathered.queryCircle(50, 40, 8, index => inCluster.push(index))
  assert('gathered points: deepest at maxDepth, found', maxDepth === 4 && same(inCluster.sort((a, b) => a - b), bruteNear(50, 40, 8, false, -1, cluster, 2)))
  assert('a point out of the area', tree.insert(999, -1, 5) === false && tree.size === COUNT)
  tree.clear()
  assert('cleared', tree.size === 0 && tree.root.points.length === 0)
})
