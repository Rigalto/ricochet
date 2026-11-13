# QuadTree

Class `QuadTree` · group `utils` · source [`src/utils/quadtree.mjs`](../../src/utils/quadtree.mjs)

A quadtree of points (an index and its coordinates).

## Methods

### constructor({x = 0, y = 0, width, height}, {capacity = 8, maxDepth = 8} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `bounds` | {x: number, y: number, width: number, height: number} | The area: the points outside are refused. |
| `options` | object |  |
| `options.capacity` | number | The points of a rectangle before it is split (default 8). |
| `options.maxDepth` | number | The maximum number of splits (default 8): the deepest rectangles keep all their points. |

### clear()

Removes all the points.

### insert(index, x, y)

Adds a point.

| Parameter | Type | Description |
| --- | --- | --- |
| `index` | number | Its index, given back by the searches. |
| `x` | number | Its abscissa. |
| `y` | number | Its ordinate. |

**Returns** `boolean` `false` when the point is out of the area.

### build(points, {count, stride = 2} = {})

Empties the tree and adds the points of an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `points` | ArrayLike<number> | The coordinates: x at `stride × i`, y at `stride × i + 1`. |
| `options` | object |  |
| `options.count` | number | The number of points (default: all those of the array). |
| `options.stride` | number | The numbers per point (default 2). |

### queryRect(x, y, width, height, callback)

Calls `callback` for each point in a rectangle (edges included).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The left of the rectangle. |
| `y` | number | Its top. |
| `width` | number | Its width. |
| `height` | number | Its height. |
| `callback` | (index: number, x: number, y: number) => void | For each point. |

### queryCircle(x, y, radius, callback)

Calls `callback` for each point within `radius` of (x, y).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The abscissa of the centre. |
| `y` | number | Its ordinate. |
| `radius` | number | The radius. |
| `callback` | (index: number, dx: number, dy: number, d2: number) => void | For each point: its index, the gap from the centre to the point, the square of the distance. |

### forEachNode(callback)

Calls `callback` for each rectangle of the tree (to draw it, or to measure it).

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | (x: number, y: number, width: number, height: number, depth: number, count: number) => void | For each rectangle: its position, its size, its depth and its number of points (0 for a split rectangle). |
