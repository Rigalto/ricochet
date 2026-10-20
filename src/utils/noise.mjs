// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Noise: numbers that vary smoothly with their coordinates, for landscapes, clouds, textures or wandering moves.
 * Two kinds, each an instance with its own generator, so that two noises do not depend on each other:
 *
 * | Class | Kind | Look |
 * | --- | --- | --- |
 * | `PerlinNoise` | gradient noise (Ken Perlin, 2002), with octaves | regular hills and valleys |
 * | `ValueNoise` | value noise, the `noise()` of p5.js and Processing | softer, a little blocky |
 *
 * Both give a number from 0 to 1 for coordinates `(x, y, z)`; `y` and `z` are optional. Neighbouring coordinates give
 * neighbouring values: a step of 0.01 to 0.1 between two points gives a smooth curve. The same generator (see the
 * `random` module) seeded the same way gives the same noise.
 *
 * **Octaves.** A noise is the sum of several layers: each layer, or octave, is finer than the previous one
 * (`scale`, the frequency) and weighs less (`amplitude`). More octaves give more details.
 *
 * ```javascript
 * import {Random, PerlinNoise} from 'ricochet/ricochet-utils.mjs'
 *
 * const relief = new PerlinNoise(new Random('world-12'))
 * for (let x = 0; x < width; x++) { height[x] = 20 + 40 * relief.get(x * 0.02) }
 * ```
 *
 * @module noise
 */

import {random as defaultRandom} from './random.mjs'

// ---------------------------------------------------------------------------------------------- PerlinNoise

const DEFAULT_OCTAVES = [{scale: 1, amplitude: 1}, {scale: 2, amplitude: 0.5}, {scale: 4, amplitude: 0.25},
  {scale: 8, amplitude: 0.125}]

const lerp = (a, b, t) => a + t * (b - a)
const fade = t => t * t * t * (t * (t * 6 - 15) + 10)

// dot product of the coordinates with one of the 12 gradients of the edges of a cube
const gradient = (hash, x, y, z) => {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

/**
 * Gradient noise (Ken Perlin's improved noise), in one, two or three dimensions, with octaves.
 */
export class PerlinNoise {
  #permutation = new Uint8Array(512)
  #octaves = []
  #total = 1

  /**
   * @param {object} [random] - The generator (see the `random` module); default: the generator of the application.
   * @param {Array<{scale: number, amplitude: number}>} [octaves] - The octaves; default: four octaves, scales 1, 2,
   *   4, 8 and amplitudes 1, 0.5, 0.25, 0.125.
   */
  constructor (random = defaultRandom, octaves = DEFAULT_OCTAVES) {
    this.random = random
    this.setOctaves(octaves)
    this.reseed()
  }

  /**
   * Changes the octaves.
   * @param {Array<{scale: number, amplitude: number}>} octaves - Scale (frequency) and amplitude of each octave.
   */
  setOctaves (octaves) {
    this.#octaves = octaves.map(({scale, amplitude}) => ({scale, amplitude}))
    this.#total = this.#octaves.reduce((sum, o) => sum + o.amplitude, 0) || 1
  }

  /** Draws a new noise from the generator. */
  reseed () {
    const p = Array.from({length: 256}, (_, i) => i)
    this.random.shuffle(p)
    for (let i = 0; i < 512; i++) { this.#permutation[i] = p[i & 255] }
  }

  // one octave, from -1 to 1
  #noise (x, y, z) {
    const p = this.#permutation
    const fx = Math.floor(x)
    const fy = Math.floor(y)
    const fz = Math.floor(z)
    const X = fx & 255
    const Y = fy & 255
    const Z = fz & 255
    x -= fx
    y -= fy
    z -= fz
    const u = fade(x)
    const v = fade(y)
    const w = fade(z)
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z
    return lerp(
      lerp(lerp(gradient(p[AA], x, y, z), gradient(p[BA], x - 1, y, z), u),
        lerp(gradient(p[AB], x, y - 1, z), gradient(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(gradient(p[AA + 1], x, y, z - 1), gradient(p[BA + 1], x - 1, y, z - 1), u),
        lerp(gradient(p[AB + 1], x, y - 1, z - 1), gradient(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w)
  }

  /**
   * The noise at a point.
   * @param {number} x - First coordinate.
   * @param {number} [y=0] - Second coordinate.
   * @param {number} [z=0] - Third coordinate.
   * @returns {number} A number from 0 to 1; 0.5 on average.
   */
  get (x, y = 0, z = 0) {
    let sum = 0
    for (const {scale, amplitude} of this.#octaves) { sum += amplitude * this.#noise(x * scale, y * scale, z * scale) }
    const value = (sum / this.#total + 1) / 2
    return value < 0 ? 0 : value > 1 ? 1 : value
  }
}

// ---------------------------------------------------------------------------------------------- ValueNoise

const Y_WRAP_BITS = 4
const Y_WRAP = 1 << Y_WRAP_BITS
const Z_WRAP_BITS = 8
const Z_WRAP = 1 << Z_WRAP_BITS
const SIZE = 4095

const scaledCosine = i => 0.5 * (1 - Math.cos(i * Math.PI))

/**
 * Value noise, as the `noise()` function of p5.js: a table of 4 096 random values, interpolated, in several octaves.
 * Each octave doubles the frequency and multiplies the amplitude by the falloff.
 */
export class ValueNoise {
  #values = new Float64Array(SIZE + 1)
  #octaves = 4
  #falloff = 0.5

  /**
   * @param {object} [random] - The generator (see the `random` module); default: the generator of the application.
   * @param {{octaves: number, falloff: number}} [detail] - Number of octaves (4) and falloff of the amplitude from
   *   one octave to the next (0.5); see `detail()`.
   */
  constructor (random = defaultRandom, {octaves = 4, falloff = 0.5} = {}) {
    this.random = random
    this.detail(octaves, falloff)
    this.reseed()
  }

  /**
   * Sets the details, as `noiseDetail()` of p5.js.
   * @param {number} octaves - Number of octaves, 1 or more.
   * @param {number} [falloff] - Factor of the amplitude from one octave to the next, from 0 to 1 (above 0.5, the
   *   noise may exceed 1).
   */
  detail (octaves, falloff) {
    if (octaves > 0) { this.#octaves = octaves }
    if (falloff > 0) { this.#falloff = falloff }
  }

  /** Draws a new noise from the generator. */
  reseed () {
    for (let i = 0; i <= SIZE; i++) { this.#values[i] = this.random.next() }
  }

  /**
   * The noise at a point (negative coordinates are taken as positive, as in p5.js).
   * @param {number} x - First coordinate.
   * @param {number} [y=0] - Second coordinate.
   * @param {number} [z=0] - Third coordinate.
   * @returns {number} A number from 0 to about 1 (with the default details, at most 0.9375).
   */
  get (x, y = 0, z = 0) {
    const values = this.#values
    x = Math.abs(x)
    y = Math.abs(y)
    z = Math.abs(z)
    let xi = Math.floor(x)
    let yi = Math.floor(y)
    let zi = Math.floor(z)
    let xf = x - xi
    let yf = y - yi
    let zf = z - zi
    let result = 0
    let amplitude = 0.5
    for (let o = 0; o < this.#octaves; o++) {
      let of = xi + (yi << Y_WRAP_BITS) + (zi << Z_WRAP_BITS)
      const rxf = scaledCosine(xf)
      const ryf = scaledCosine(yf)
      let n1 = values[of & SIZE]
      n1 += rxf * (values[(of + 1) & SIZE] - n1)
      let n2 = values[(of + Y_WRAP) & SIZE]
      n2 += rxf * (values[(of + Y_WRAP + 1) & SIZE] - n2)
      n1 += ryf * (n2 - n1)
      of += Z_WRAP
      n2 = values[of & SIZE]
      n2 += rxf * (values[(of + 1) & SIZE] - n2)
      let n3 = values[(of + Y_WRAP) & SIZE]
      n3 += rxf * (values[(of + Y_WRAP + 1) & SIZE] - n3)
      n2 += ryf * (n3 - n2)
      n1 += scaledCosine(zf) * (n2 - n1)
      result += n1 * amplitude
      amplitude *= this.#falloff
      xi <<= 1
      xf *= 2
      yi <<= 1
      yf *= 2
      zi <<= 1
      zf *= 2
      if (xf >= 1) { xi++; xf-- }
      if (yf >= 1) { yi++; yf-- }
      if (zf >= 1) { zi++; zf-- }
    }
    return result
  }
}
