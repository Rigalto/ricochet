// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Small functions on numbers: bounds, interpolation, angles, rounding. Their names and their parameters follow
 * `MathUtils` of Three.js and lodash, so that they are familiar.
 *
 * | Function | Result |
 * | --- | --- |
 * | `clamp(value, min, max)` | `value` brought between `min` and `max` |
 * | `isBetween(value, min, max)` | `true` if `min ≤ value ≤ max` (both bounds included, unlike `inRange` of lodash) |
 * | `approxEqual(a, b, epsilon)` | `true` if `a` and `b` differ by less than a relative `epsilon` |
 * | `lerp(x, y, t)` | linear interpolation: `x` for `t = 0`, `y` for `t = 1` |
 * | `inverseLerp(x, y, value)` | the `t` that gives `value` |
 * | `mapLinear(value, a1, a2, b1, b2)` | `value` of the range `a1…a2` carried over to the range `b1…b2` |
 * | `damp(x, y, lambda, dt)` | moves `x` towards `y` at a rate independent of the frame rate |
 * | `smoothstep(x, min, max)`, `smootherstep(x, min, max)` | 0 to 1 between `min` and `max`, with a soft start and end |
 * | `cosineInterpolate(x, y, t)` | interpolation on a half cosine |
 * | `sigmoid(value)` | logistic function, from 0 to 1 |
 * | `degToRad(degrees)`, `radToDeg(radians)` | angle conversions |
 * | `euclideanModulo(n, m)` | remainder of `n / m`, always of the sign of `m` (`-1 mod 5` is 4) |
 * | `roundTo(value, digits)` | rounded to `digits` decimals |
 * | `splitNumber(value)` | `{int, fract}`: the integer part (towards minus infinity) and the rest |
 * | `isPowerOfTwo(n)` | `true` for 1, 2, 4, 8… |
 * | `isNumber(value)`, `toNumber(value, fallback)` | a finite number (or a string holding one), and its value |
 *
 * ```javascript
 * import {clamp, lerp, damp} from 'ricochet/ricochet-utils.mjs'
 *
 * volume = clamp(volume + step, 0, 100)
 * camera.x = damp(camera.x, target.x, 8, dt / 1000) // the same smoothness at 30 and at 144 frames per second
 * ```
 *
 * @module math
 */

/**
 * Brings a value between two bounds.
 * @param {number} value - The value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {number} `min` if the value is lower, `max` if it is greater, the value otherwise.
 */
export const clamp = (value, min, max) => value < min ? min : value > max ? max : value

/**
 * Tells whether a value lies between two bounds, both included.
 * @param {number} value - The value.
 * @param {number} min - Lower bound.
 * @param {number} max - Upper bound.
 * @returns {boolean} `true` if `min ≤ value ≤ max`.
 */
export const isBetween = (value, min, max) => value >= min && value <= max

/**
 * Compares two numbers with a tolerance relative to their size (absolute below 1).
 * @param {number} a - First number.
 * @param {number} b - Second number.
 * @param {number} [epsilon=1e-6] - Tolerance.
 * @returns {boolean} `true` if `abs(a - b) ≤ epsilon × max(1, abs(a), abs(b))`.
 */
export const approxEqual = (a, b, epsilon = 1e-6) => Math.abs(a - b) <= epsilon * Math.max(1, Math.abs(a), Math.abs(b))

/**
 * Linear interpolation.
 * @param {number} x - Value for `t = 0`.
 * @param {number} y - Value for `t = 1`.
 * @param {number} t - Position, usually between 0 and 1.
 * @returns {number} `x + (y - x) × t`.
 */
export const lerp = (x, y, t) => x + (y - x) * t

/**
 * The position of a value between two others: the inverse of `lerp()`.
 * @param {number} x - Value for 0.
 * @param {number} y - Value for 1.
 * @param {number} value - The value.
 * @returns {number} `(value - x) / (y - x)`, or 0 when `x` and `y` are equal.
 */
export const inverseLerp = (x, y, value) => x === y ? 0 : (value - x) / (y - x)

/**
 * Carries a value from one range over to another.
 * @param {number} value - The value, in the range `a1…a2`.
 * @param {number} a1 - Start of the first range.
 * @param {number} a2 - End of the first range.
 * @param {number} b1 - Start of the second range.
 * @param {number} b2 - End of the second range.
 * @returns {number} The value in the range `b1…b2` (not clamped).
 */
export const mapLinear = (value, a1, a2, b1, b2) => b1 + (value - a1) * (b2 - b1) / (a2 - a1)

/**
 * Moves a value towards a target, at a rate that does not depend on the frame rate (exponential decay).
 * @param {number} x - Current value.
 * @param {number} y - Target.
 * @param {number} lambda - Speed: the higher, the faster (about 1 to 25).
 * @param {number} dt - Time since the last call, in seconds.
 * @returns {number} The new value.
 */
export const damp = (x, y, lambda, dt) => lerp(x, y, 1 - Math.exp(-lambda * dt))

/**
 * Smooth step from 0 to 1: `3t² - 2t³`, where `t` is the position of `x` between `min` and `max`.
 * @param {number} x - The value.
 * @param {number} min - Value giving 0.
 * @param {number} max - Value giving 1.
 * @returns {number} A number from 0 to 1.
 */
export const smoothstep = (x, min, max) => {
  if (x <= min) { return 0 }
  if (x >= max) { return 1 }
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

/**
 * Smoother step from 0 to 1: `6t⁵ - 15t⁴ + 10t³`, flat at both ends (Ken Perlin).
 * @param {number} x - The value.
 * @param {number} min - Value giving 0.
 * @param {number} max - Value giving 1.
 * @returns {number} A number from 0 to 1.
 */
export const smootherstep = (x, min, max) => {
  if (x <= min) { return 0 }
  if (x >= max) { return 1 }
  const t = (x - min) / (max - min)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Interpolation on a half cosine: softer than `lerp()` near both ends.
 * @param {number} x - Value for `t = 0`.
 * @param {number} y - Value for `t = 1`.
 * @param {number} t - Position, between 0 and 1.
 * @returns {number} The interpolated value.
 */
export const cosineInterpolate = (x, y, t) => lerp(x, y, (1 - Math.cos(t * Math.PI)) / 2)

/**
 * Logistic function.
 * @param {number} value - Any number.
 * @returns {number} `1 / (1 + e^-value)`, from 0 to 1, 0.5 for 0.
 */
export const sigmoid = value => 1 / (1 + Math.exp(-value))

/**
 * Converts degrees to radians.
 * @param {number} degrees - Angle in degrees.
 * @returns {number} Angle in radians.
 */
export const degToRad = degrees => degrees * Math.PI / 180

/**
 * Converts radians to degrees.
 * @param {number} radians - Angle in radians.
 * @returns {number} Angle in degrees.
 */
export const radToDeg = radians => radians * 180 / Math.PI

/**
 * Remainder of a division, of the sign of the divisor: useful to wrap an index or an angle.
 * @param {number} n - Dividend.
 * @param {number} m - Divisor.
 * @returns {number} A number from 0 (included) to `m` (excluded).
 */
export const euclideanModulo = (n, m) => ((n % m) + m) % m

/**
 * Rounds to a number of decimals.
 * @param {number} value - The value.
 * @param {number} [digits=0] - Number of decimals.
 * @returns {number} The rounded value.
 */
export const roundTo = (value, digits = 0) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/**
 * Splits a number into its integer part, towards minus infinity, and the rest.
 * @param {number} value - The value.
 * @returns {{int: number, fract: number}} `int + fract === value`, with `0 ≤ fract < 1`.
 */
export const splitNumber = value => {
  const int = Math.floor(value)
  return {int, fract: value - int}
}

/**
 * Tells whether an integer is a power of two.
 * @param {number} n - A positive integer.
 * @returns {boolean} `true` for 1, 2, 4, 8…
 */
export const isPowerOfTwo = n => n > 0 && (n & (n - 1)) === 0

/**
 * Tells whether a value is a finite number, or a string holding one (`'3.5'`, `' -2 '`).
 * @param {*} value - The value.
 * @returns {boolean} `true` if `toNumber()` would give its value.
 */
export const isNumber = value => {
  if (typeof value === 'number') { return Number.isFinite(value) }
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
}

/**
 * Reads a number.
 * @param {*} value - A number, or a string holding one.
 * @param {number} [fallback=0] - Result when the value is not a finite number.
 * @returns {number} The number.
 */
export const toNumber = (value, fallback = 0) => isNumber(value) ? Number(value) : fallback
