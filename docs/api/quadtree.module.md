# quadtree

Module `quadtree` · group `utils` · source [`src/utils/quadtree.mjs`](../../src/utils/quadtree.mjs)

A quadtree of points: a rectangle split into four when it holds too many points, and so on. A search only opens
the rectangles that meet it: suited to points gathered in a few places, and to searches of very different sizes.

```javascript
import {QuadTree} from 'ricochet/ricochet-utils.mjs'

const tree = new QuadTree({x: 0, y: 0, width: 800, height: 600}, {capacity: 8})
tree.build(positions, {count: 1000, stride: 4})     // or tree.insert(index, x, y), one by one
tree.queryCircle(x, y, 50, (index, dx, dy, d2) => { … })
tree.queryRect(0, 0, 100, 100, (index, x, y) => { … })
tree.forEachNode((x, y, width, height, depth) => ctx.strokeRect(x, y, width, height))
```

A point keeps its index: the tree stores indexes and coordinates, the application keeps its own data. For points
spread over the area and searches of about the same radius, the [grid](spatial-grid.module.md) is simpler and
faster to rebuild.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `QuadTree` | class | A quadtree of points (an index and its coordinates). |
