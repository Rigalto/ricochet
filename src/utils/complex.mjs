// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Complex numbers: `z = r + i·i`, or in polar form `z = mod · e^(i·arg)`.
 *
 * A `Complex` holds its real part `r` and its imaginary part `i`; `mod` (modulus) and `arg` (argument, in radians,
 * from -π to π) are computed. Operations never change a number: they return a new one.
 *
 * ## Creating a number
 *
 * `new Complex(r, i)` takes the two parts. `Complex.from(value)` reads any of these forms, and every operation
 * accepts them as its operand:
 *
 * | Form | Example | Number |
 * | --- | --- | --- |
 * | a number | `3` | 3 + 0i |
 * | two numbers | `Complex.from(3, -2)`, `z.add(3, -2)` | 3 - 2i |
 * | a string | `'3-2i'`, `'-2.5i'`, `'i'`, `'1e3 + 4i'` | spaces are ignored |
 * | an array | `[3, -2]` | 3 - 2i |
 * | parts | `{r: 3, i: -2}` | 3 - 2i |
 * | a point or a vector | `{x: 3, y: -2}` | 3 - 2i |
 * | polar, in radians | `{mod: 2, arg: Math.PI / 2}` | 2i |
 * | polar, in degrees | `{mod: 2, deg: 90}` | 2i |
 *
 * A form that cannot be read gives `NaN` parts, as `Number('x')` gives `NaN`; so does a division by zero.
 *
 * ## Operations
 *
 * `add`, `sub`, `mul`, `div`, `negate`, `scale(k)`, `inverse`, `conjugate`, `exp`, `ln`, `pow(k)` (a real power),
 * `sqrt`, `equals(z, epsilon)`, `floor`, `ceil`, `round`, `roundTo(digits)`.
 *
 * ```javascript
 * import {Complex} from 'ricochet/ricochet-utils.mjs'
 *
 * // a point of the Mandelbrot set: z → z² + c
 * let z = new Complex()
 * const c = Complex.from('-0.75+0.1i')
 * for (let n = 0; n < 100 && z.mod <= 2; n++) { z = z.mul(z).add(c) }
 * ```
 *
 * @module complex
 */

import {approxEqual, degToRad, roundTo} from './math.mjs'

const N = String.raw`(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`
const REAL = new RegExp(`^[+-]?${N}$`, 'i')
const IMAGINARY = new RegExp(`^([+-]?)(${N})?i$`, 'i')
const BOTH = new RegExp(`^([+-]?${N})([+-])(${N})?i$`, 'i')

// '3', '-2.5i', 'i', '3-2i', '1e3+4i'; NaN parts for anything else
const parse = text => {
  const s = text.replace(/\s+/g, '')
  if (REAL.test(s)) { return [Number(s), 0] }
  let m = s.match(IMAGINARY)
  if (m !== null) { return [0, (m[1] === '-' ? -1 : 1) * (m[2] === undefined ? 1 : Number(m[2]))] }
  m = s.match(BOTH)
  if (m !== null) { return [Number(m[1]), (m[2] === '-' ? -1 : 1) * (m[3] === undefined ? 1 : Number(m[3]))] }
  return [NaN, NaN]
}

/**
 * A complex number.
 */
export class Complex {
  /**
   * @param {number} [r=0] - Real part.
   * @param {number} [i=0] - Imaginary part.
   */
  constructor (r = 0, i = 0) {
    /** Real part. */
    this.r = r
    /** Imaginary part. */
    this.i = i
  }

  /**
   * Reads a complex number from any of its forms (see the module).
   * @param {*} value - A `Complex`, a number, a string, an array, `{r, i}`, `{x, y}`, `{mod, arg}` or `{mod, deg}`.
   * @param {number} [imaginary] - With a number as first parameter: the imaginary part.
   * @returns {Complex} The number; a `Complex` given is returned as it is.
   */
  static from (value, imaginary) {
    if (value instanceof Complex) { return value }
    if (typeof value === 'number') { return new Complex(value, imaginary ?? 0) }
    if (typeof value === 'string') { return new Complex(...parse(value)) }
    if (Array.isArray(value)) { return new Complex(Number(value[0] ?? 0), Number(value[1] ?? 0)) }
    if (value !== null && typeof value === 'object') {
      if ('r' in value || 'i' in value) { return new Complex(Number(value.r ?? 0), Number(value.i ?? 0)) }
      if ('x' in value || 'y' in value) { return new Complex(Number(value.x ?? 0), Number(value.y ?? 0)) }
      if ('mod' in value) {
        const arg = 'deg' in value ? degToRad(Number(value.deg)) : Number(value.arg ?? 0)
        return Complex.polar(Number(value.mod), arg)
      }
    }
    if (value === undefined) { return new Complex() }
    return new Complex(NaN, NaN)
  }

  /**
   * A complex number from its polar form.
   * @param {number} mod - Modulus.
   * @param {number} arg - Argument, in radians.
   * @returns {Complex} `mod · (cos arg + i·sin arg)`.
   */
  static polar (mod, arg) { return new Complex(mod * Math.cos(arg), mod * Math.sin(arg)) }

  /** Modulus: the distance to 0. */
  get mod () { return Math.hypot(this.r, this.i) }

  /** Argument: the angle with the real axis, in radians, from -π to π. */
  get arg () { return Math.atan2(this.i, this.r) }

  /**
   * Sum.
   * @param {*} z - The other number, in any form.
   * @param {number} [imaginary] - Its imaginary part, when `z` is a number.
   * @returns {Complex} `this + z`.
   */
  add (z, imaginary) {
    z = Complex.from(z, imaginary)
    return new Complex(this.r + z.r, this.i + z.i)
  }

  /**
   * Difference.
   * @param {*} z - The other number, in any form.
   * @param {number} [imaginary] - Its imaginary part, when `z` is a number.
   * @returns {Complex} `this - z`.
   */
  sub (z, imaginary) {
    z = Complex.from(z, imaginary)
    return new Complex(this.r - z.r, this.i - z.i)
  }

  /**
   * Product.
   * @param {*} z - The other number, in any form.
   * @param {number} [imaginary] - Its imaginary part, when `z` is a number.
   * @returns {Complex} `this × z`.
   */
  mul (z, imaginary) {
    z = Complex.from(z, imaginary)
    return new Complex(this.r * z.r - this.i * z.i, this.r * z.i + this.i * z.r)
  }

  /**
   * Quotient.
   * @param {*} z - The other number, in any form.
   * @param {number} [imaginary] - Its imaginary part, when `z` is a number.
   * @returns {Complex} `this / z`; `NaN` parts if `z` is 0.
   */
  div (z, imaginary) {
    z = Complex.from(z, imaginary)
    const d = z.r * z.r + z.i * z.i
    if (d === 0) { return new Complex(NaN, NaN) }
    return new Complex((this.r * z.r + this.i * z.i) / d, (this.i * z.r - this.r * z.i) / d)
  }

  /**
   * Opposite.
   * @returns {Complex} `-this`.
   */
  negate () { return new Complex(-this.r, -this.i) }

  /**
   * Product by a real number.
   * @param {number} k - The factor.
   * @returns {Complex} `k × this`.
   */
  scale (k) { return new Complex(k * this.r, k * this.i) }

  /**
   * Inverse.
   * @returns {Complex} `1 / this`; `NaN` parts for 0.
   */
  inverse () {
    const d = this.r * this.r + this.i * this.i
    if (d === 0) { return new Complex(NaN, NaN) }
    return new Complex(this.r / d, -this.i / d)
  }

  /**
   * Conjugate.
   * @returns {Complex} `r - i·i`.
   */
  conjugate () { return new Complex(this.r, -this.i) }

  /**
   * Exponential.
   * @returns {Complex} `e^this = e^r · (cos i + i·sin i)`.
   */
  exp () { return Complex.polar(Math.exp(this.r), this.i) }

  /**
   * Natural logarithm (principal value).
   * @returns {Complex} `ln(mod) + i·arg`.
   */
  ln () { return new Complex(Math.log(this.mod), this.arg) }

  /**
   * Real power (principal value).
   * @param {number} k - The exponent.
   * @returns {Complex} `mod^k · e^(i·k·arg)`.
   */
  pow (k) { return Complex.polar(this.mod ** k, this.arg * k) }

  /**
   * Square root (principal value: real part positive or zero).
   * @returns {Complex} The number whose square is `this`.
   */
  sqrt () { return Complex.polar(Math.sqrt(this.mod), this.arg / 2) }

  /**
   * Compares with a tolerance (see `approxEqual()` in the `math` module).
   * @param {*} z - The other number, in any form.
   * @param {number} [epsilon=1e-6] - Tolerance, on each part.
   * @returns {boolean} `true` if both parts are nearly equal.
   */
  equals (z, epsilon = 1e-6) {
    z = Complex.from(z)
    return approxEqual(this.r, z.r, epsilon) && approxEqual(this.i, z.i, epsilon)
  }

  /**
   * Both parts rounded down.
   * @returns {Complex} The rounded number.
   */
  floor () { return new Complex(Math.floor(this.r), Math.floor(this.i)) }

  /**
   * Both parts rounded up.
   * @returns {Complex} The rounded number.
   */
  ceil () { return new Complex(Math.ceil(this.r), Math.ceil(this.i)) }

  /**
   * Both parts rounded to the nearest integer.
   * @returns {Complex} The rounded number.
   */
  round () { return new Complex(Math.round(this.r), Math.round(this.i)) }

  /**
   * Both parts rounded to a number of decimals.
   * @param {number} [digits=2] - Number of decimals.
   * @returns {Complex} The rounded number.
   */
  roundTo (digits = 2) { return new Complex(roundTo(this.r, digits), roundTo(this.i, digits)) }

  /**
   * The number as a string, readable by `Complex.from()`.
   * @param {number} [digits=6] - Decimals at most; trailing zeros are removed.
   * @returns {string} For instance `'3-2.5i'`, `'4'`, `'-i'`; `'NaN'` if a part is not a number.
   */
  toString (digits = 6) {
    if (Number.isNaN(this.r) || Number.isNaN(this.i)) { return 'NaN' }
    const r = roundTo(this.r, digits) + 0 // + 0: no -0
    const i = roundTo(this.i, digits) + 0
    if (i === 0) { return `${r}` }
    const imaginary = i === 1 ? 'i' : i === -1 ? '-i' : `${i}i`
    if (r === 0) { return imaginary }
    return `${r}${i > 0 ? '+' : ''}${imaginary}`
  }

  /**
   * The parts in an array.
   * @returns {number[]} `[r, i]`.
   */
  toArray () { return [this.r, this.i] }

  /**
   * The parts in an object, used by `JSON.stringify()`.
   * @returns {{r: number, i: number}} The parts.
   */
  toJSON () { return {r: this.r, i: this.i} }

  /**
   * Writes the parts as two 32-bit floats (little-endian), for a buffer sent to the graphics card.
   * @param {DataView} view - The buffer.
   * @param {number} offset - Position in bytes.
   * @returns {number} The number of bytes written: 8.
   */
  toDataView (view, offset) {
    view.setFloat32(offset, this.r, true)
    view.setFloat32(offset + 4, this.i, true)
    return 8
  }
}
