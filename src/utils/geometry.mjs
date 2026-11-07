// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Overlap tests of simple shapes, for the collisions of a game: circles, axis-aligned rectangles and points, given as
 * plain objects — the entities of the game are tested as they are.
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
 *
 * Shapes that only touch do not overlap. The tests compare squared distances: no square root.
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
