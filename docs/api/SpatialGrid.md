# SpatialGrid

Class `SpatialGrid` · group `utils` · source [`src/utils/spatial-grid.mjs`](../../src/utils/spatial-grid.mjs)

A grid of cells for the search of neighbours.

## Methods

### constructor({width, height, cellSize, wrap = false})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | object |  |
| `options.width` | number | The width of the area (from 0). |
| `options.height` | number | Its height (from 0). |
| `options.cellSize` | number | The minimum side of a cell: the usual search radius. |
| `options.wrap` | boolean | A wrapped area (torus). |

### build(points, {count, stride = 2} = {})

Sorts the points into the cells. The array is kept, not copied: rebuild after moving the points.

| Parameter | Type | Description |
| --- | --- | --- |
| `points` | ArrayLike<number> | The coordinates: x at `stride × i`, y at `stride × i + 1`. |
| `options` | object |  |
| `options.count` | number | The number of points (default: all those of the array). |
| `options.stride` | number | The numbers per point (default 2). |

### forEachNear(x, y, radius, callback, {exclude = -1} = {})

Calls `callback` for each point within `radius` of (x, y).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The abscissa of the centre. |
| `y` | number | Its ordinate. |
| `radius` | number | The radius. |
| `callback` | (index: number, dx: number, dy: number, d2: number) => void | For each point: its index, the gap from the centre to the point (through the edge when it is shorter), the square of the distance. |
| `options` | object |  |
| `options.exclude` | number | An index to skip (the point at the centre). |

### near(x, y, radius, options)

The indexes of the points within `radius` of (x, y), in no particular order.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The abscissa of the centre. |
| `y` | number | Its ordinate. |
| `radius` | number | The radius. |
| `options` | {exclude?: number} | An index to skip. |

**Returns** `number[]` The indexes.

### nearest(x, y, k, {exclude = -1, maxRadius = Infinity} = {})

The `k` nearest points of (x, y), from the nearest: the search widens ring by ring until no closer point can
remain.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The abscissa of the centre. |
| `y` | number | Its ordinate. |
| `k` | number | The number of points. |
| `options` | object |  |
| `options.exclude` | number | An index to skip (the point at the centre). |
| `options.maxRadius` | number | No point beyond this distance (default: none). |

**Returns** `{index: number, dx: number, dy: number, d2: number}[]` At most `k` points, sorted by distance.
