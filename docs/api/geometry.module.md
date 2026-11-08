# geometry

Module `geometry` · group `utils` · source [`src/utils/geometry.mjs`](../../src/utils/geometry.mjs)

Overlap tests of simple shapes, for the collisions of a game: circles, axis-aligned rectangles and points, given as
plain objects — the entities of the game are tested as they are; and the bounce of a moving circle (a ball) on a
rectangle (a brick, a paddle, a wall).

```javascript
import {circlesOverlap, circleRectOverlap} from 'ricochet/ricochet-utils.mjs'

const ball = {x: 100, y: 80, radius: 12}
const alien = {x: 110, y: 90, radius: 32}
if (circlesOverlap(ball, alien)) { … }
```

| Shape | Object |
| --- | --- |
| circle | `{x, y, radius}` (the centre) |
| rectangle | `{x, y, width, height}` (the top left corner, sides parallel to the axes) |
| point | `{x, y}` |
| moving circle | `{x, y, radius, vx, vy}` (the speed: any unit, per ms say) |

Shapes that only touch do not overlap. The tests compare squared distances: no square root.

## The bounce

`bounceCircleOnRect(ball, rect)` is called once the ball has moved: if it now overlaps the rectangle, it bounces on
the side it came through (seen from its direction), and comes back out by as much as it went in. The rectangle is
widened by the radius on every side (its corners count as square: enough for a game). The ball must not move by
more than its radius between two tests, or it may go through a thin rectangle: a fast game cuts its step in smaller
ones.

```javascript
ball.x += ball.vx * dt
ball.y += ball.vy * dt
if (bounceCircleOnRect(ball, brick) !== null) { … }   // 'top', 'bottom', 'left' or 'right'
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `circlesOverlap` | function | Whether two circles overlap. |
| `rectsOverlap` | function | Whether two rectangles overlap. |
| `circleRectOverlap` | function | Whether a circle and a rectangle overlap. |
| `pointInCircle` | function | Whether a point is inside a circle. |
| `pointInRect` | function | Whether a point is inside a rectangle (the edges included). |
| `bounceCircleOnRect` | function | Bounces a moving circle on a rectangle it now overlaps: the speed is reflected on the side it came through, and the circle is moved back out by as much as it went in. Nothing happens when they do not overlap. |

## Details

### circlesOverlap()

Whether two circles overlap.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | {x: number, y: number, radius: number} | A circle. |
| `b` | {x: number, y: number, radius: number} | Another circle. |

**Returns** `boolean` 

### rectsOverlap()

Whether two rectangles overlap.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | {x: number, y: number, width: number, height: number} | A rectangle. |
| `b` | {x: number, y: number, width: number, height: number} | Another rectangle. |

**Returns** `boolean` 

### circleRectOverlap()

Whether a circle and a rectangle overlap.

| Parameter | Type | Description |
| --- | --- | --- |
| `circle` | {x: number, y: number, radius: number} | The circle. |
| `rect` | {x: number, y: number, width: number, height: number} | The rectangle. |

**Returns** `boolean` 

### pointInCircle()

Whether a point is inside a circle.

| Parameter | Type | Description |
| --- | --- | --- |
| `point` | {x: number, y: number} | The point. |
| `circle` | {x: number, y: number, radius: number} | The circle. |

**Returns** `boolean` 

### pointInRect()

Whether a point is inside a rectangle (the edges included).

| Parameter | Type | Description |
| --- | --- | --- |
| `point` | {x: number, y: number} | The point. |
| `rect` | {x: number, y: number, width: number, height: number} | The rectangle. |

**Returns** `boolean` 

### bounceCircleOnRect()

Bounces a moving circle on a rectangle it now overlaps: the speed is reflected on the side it came through, and the
circle is moved back out by as much as it went in. Nothing happens when they do not overlap.

| Parameter | Type | Description |
| --- | --- | --- |
| `ball` | {x: number, y: number, radius: number, vx: number, vy: number} | The circle, changed in place. |
| `rect` | {x: number, y: number, width: number, height: number} | The rectangle. |

**Returns** `string|null` The side of the rectangle hit (`top`, `bottom`, `left`, `right`), or `null`.
