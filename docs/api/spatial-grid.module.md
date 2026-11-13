# spatial-grid

Module `spatial-grid` · group `utils` · source [`src/utils/spatial-grid.mjs`](../../src/utils/spatial-grid.mjs)

The neighbours of a point among thousands, without comparing every pair: the points are sorted into the cells of
a grid, and a search only visits the cells around the point. Rebuilt at each frame for moving points (a flock, a
swarm of particles, the enemies near the player), in typed arrays: nothing is allocated by a rebuild.

```javascript
import {SpatialGrid} from 'ricochet/ricochet-utils.mjs'

const grid = new SpatialGrid({width: 800, height: 600, cellSize: 50, wrap: true})
grid.build(positions, {count: 1000, stride: 4})     // x at 4 i, y at 4 i + 1
grid.forEachNear(x, y, 50, (index, dx, dy, d2) => { … }, {exclude: i})
grid.nearest(x, y, 7, {exclude: i})                 // the 7 nearest, sorted
```

## The cells

The cells are at least `cellSize` wide: a search within `cellSize` visits the 3 × 3 cells around the point. Take
the largest search radius as `cellSize`; a larger radius still works, by visiting more cells.

## The wrapped area

With `wrap`, the right edge touches the left edge and the bottom touches the top (a torus): a point near an edge
finds its neighbours on the other side, and `dx`, `dy` are the shortest way, through the edge if it is shorter.

## Grid or quadtree

The grid suits points spread over the area and searches of about the same radius: it is the simplest and the
fastest to rebuild. The [quadtree](quadtree.module.md) suits points gathered in a few places, or searches of very
different sizes.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `SpatialGrid` | class | A grid of cells for the search of neighbours. |
