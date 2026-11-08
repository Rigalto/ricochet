// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Overlap tests of simple shapes, for the collisions of a game: circles, axis-aligned rectangles and points, given as
 * plain objects — the entities of the game are tested as they are; and the bounce of a moving circle (a ball) on a
 * rectangle (a brick, a paddle, a wall).
 *
 * ```javascript
 * import {circlesOverlap, circleRectOverlap} from 'ricochet/ricochet-utils.mjs'
 *
 * const ball = {x: 100, y: 80, radius: 12}
 * const alien = {x: 110, y: 90, radius: 32}
 * if (circlesOverlap(ball, alien)) { … }
 * ```
 *
 * | Shape | Object |
 * | --- | --- |
 * | circle | `{x, y, radius}` (the centre) |
 * | rectangle | `{x, y, width, height}` (the top left corner, sides parallel to the axes) |
 * | point | `{x, y}` |
 * | moving circle | `{x, y, radius, vx, vy}` (the speed: any unit, per ms say) |
 *
 * Shapes that only touch do not overlap. The tests compare squared distances: no square root.
 *
 * ## The bounce
 *
 * `bounceCircleOnRect(ball, rect)` is called once the ball has moved: if it now overlaps the rectangle, it bounces on
 * the side it came through (seen from its direction), and comes back out by as much as it went in. The rectangle is
 * widened by the radius on every side (its corners count as square: enough for a game). The ball must not move by
 * more than its radius between two tests, or it may go through a thin rectangle: a fast game cuts its step in smaller
 * ones.
 *
 * ```javascript
 * ball.x += ball.vx * dt
 * ball.y += ball.vy * dt
 * if (bounceCircleOnRect(ball, brick) !== null) { … }   // 'top', 'bottom', 'left' or 'right'
 * ```
 *
 * @module geometry
 */

/**
 * Whether two circles overlap.
 * @param {{x: number, y: number, radius: number}} a - A circle.
 * @param {{x: number, y: number, radius: number}} b - Another circle.
 * @returns {boolean}
 */
export const circlesOverlap = (a, b) => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const limit = a.radius + b.radius
  return dx * dx + dy * dy < limit * limit
}

/**
 * Whether two rectangles overlap.
 * @param {{x: number, y: number, width: number, height: number}} a - A rectangle.
 * @param {{x: number, y: number, width: number, height: number}} b - Another rectangle.
 * @returns {boolean}
 */
export const rectsOverlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/**
 * Whether a circle and a rectangle overlap.
 * @param {{x: number, y: number, radius: number}} circle - The circle.
 * @param {{x: number, y: number, width: number, height: number}} rect - The rectangle.
 * @returns {boolean}
 */
export const circleRectOverlap = (circle, rect) => {
  // the point of the rectangle nearest to the centre of the circle
  const dx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width)) - circle.x
  const dy = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height)) - circle.y
  return dx * dx + dy * dy < circle.radius * circle.radius
}

/**
 * Whether a point is inside a circle.
 * @param {{x: number, y: number}} point - The point.
 * @param {{x: number, y: number, radius: number}} circle - The circle.
 * @returns {boolean}
 */
export const pointInCircle = (point, circle) => {
  const dx = point.x - circle.x
  const dy = point.y - circle.y
  return dx * dx + dy * dy < circle.radius * circle.radius
}

/**
 * Whether a point is inside a rectangle (the edges included).
 * @param {{x: number, y: number}} point - The point.
 * @param {{x: number, y: number, width: number, height: number}} rect - The rectangle.
 * @returns {boolean}
 */
export const pointInRect = (point, rect) =>
  point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height

/**
 * Bounces a moving circle on a rectangle it now overlaps: the speed is reflected on the side it came through, and the
 * circle is moved back out by as much as it went in. Nothing happens when they do not overlap.
 * @param {{x: number, y: number, radius: number, vx: number, vy: number}} ball - The circle, changed in place.
 * @param {{x: number, y: number, width: number, height: number}} rect - The rectangle.
 * @returns {string|null} The side of the rectangle hit (`top`, `bottom`, `left`, `right`), or `null`.
 */
export const bounceCircleOnRect = (ball, rect) => {
  // the rectangle widened by the radius: the centre of the ball is tested against it
  const left = rect.x - ball.radius
  const right = rect.x + rect.width + ball.radius
  const top = rect.y - ball.radius
  const bottom = rect.y + rect.height + ball.radius
  if (ball.x < left || ball.x > right || ball.y < top || ball.y > bottom) { return null }
  // the horizontal side it faces (seen from its direction): crossed within the width?
  if (ball.vy !== 0) {
    const side = ball.vy < 0 ? 'bottom' : 'top'
    const y = side === 'bottom' ? bottom : top
    const x = ball.x + ball.vx / ball.vy * (y - ball.y)
    if (x >= left && x <= right) {
      ball.y = 2 * y - ball.y
      ball.vy = -ball.vy
      return side
    }
  }
  // the vertical side it faces: crossed within the height?
  if (ball.vx !== 0) {
    const side = ball.vx < 0 ? 'right' : 'left'
    const x = side === 'right' ? right : left
    const y = ball.y + ball.vy / ball.vx * (x - ball.x)
    if (y >= top && y <= bottom) {
      ball.x = 2 * x - ball.x
      ball.vx = -ball.vx
      return side
    }
  }
  return null
}
