// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The `d` attribute of an SVG `<path>`, as a list of segments: read it (with the place of the first error), write it
 * back (plain or compact), turn its commands absolute or relative, round its numbers, move, scale, turn or mirror it,
 * and check it against the drawing rules of the icon set ([iconset](iconset.module.md)). No DOM: it runs in a page or
 * in Node.
 *
 * ```javascript
 * import {parsePath, serializePath, rotatePath, checkIconsetPath} from 'ricochet/ricochet-utils.mjs'
 *
 * const {segments, errors} = parsePath('M4 11h16a1 1 0 0 1 0 2h-16a1 1 0 0 1 0-2z')
 * serializePath(rotatePath(segments))           // 'M13 4v16a1 1 0 0 1-2 0v-16a1 1 0 0 1 2 0z'
 * checkIconsetPath('M4 11h16.125v2h-16z')      // [{code: 'decimals', level: 'error', segment: 1}]
 * ```
 *
 * ## Segments
 *
 * A segment is `{command, values}`: the letter of the command, upper case when absolute, lower case when relative,
 * and its numbers in the order of the SVG syntax. A command repeated without its letter (`l1 2 3 4`) gives one segment
 * per repetition; the pairs after a move (`M1 2 3 4`) are lines (`L`, or `l` after `m`).
 *
 * | Command | Values |
 * | --- | --- |
 * | `M` `L` `T` | `x y` |
 * | `H` / `V` | `x` / `y` |
 * | `C` | `x1 y1 x2 y2 x y` |
 * | `S` `Q` | `x1 y1 x y` |
 * | `A` | `rx ry angle large-arc sweep x y` |
 * | `Z` | none |
 *
 * The functions never change the segments they are given: they return new ones.
 *
 * ## Writing
 *
 * `serializePath` writes the letter, then the numbers separated by a space, with no space before a minus sign
 * (`l4.08-4.08`), the style of the icon set. The compact writing also drops the zero before the decimal point (`.28`,
 * `-.5`) and the space before a number starting with a point when the previous one already has its own (`1.5.5`): the
 * writing of the minifiers, a few bytes less. Both are read back the same.
 *
 * ## Transformations
 *
 * `insetPath` moves the outline of a shape inwards: drawn the other way round, the hole that leaves a stroke.
 *
 * `cleanPath` rewrites a path in the writing of the icon set (relative commands, `h` and `v`, nothing useless).
 *
 * `reversePath` draws each shape the other way round (a hole goes in the direction opposite to its outline).
 *
 * Moving, scaling, turning a quarter turn and mirroring keep each command absolute or relative, and keep the
 * horizontal and vertical lines horizontal or vertical (a quarter turn makes an `h` a `v`). The arcs follow: radii
 * scaled, axis turned, sweep reversed by a mirror. The first move of a path is absolute even when written `m`.
 * Coordinates are those of the screen: `y` goes down, so a quarter turn clockwise sends the right to the bottom. The
 * centre is `12 12` by default, the middle of an icon.
 *
 * ## Icon set rules
 *
 * `checkIconsetPath(d)` lists what breaks the rules of the icon set, each with its level and, when it has one, the
 * index of the segment at fault:
 *
 * | Code | Level | Rule |
 * | --- | --- | --- |
 * | `syntax` | error | the path is not valid SVG (`error`: the error of `parsePath`) |
 * | `empty` | error | there is no shape |
 * | `shape-start` | error | a shape does not start with `M` |
 * | `shape-end` | error | a shape does not end with `z` |
 * | `command` | error | a command other than `h`, `v`, `l` and `a` inside a shape |
 * | `decimals` | error | a number with more than two decimals |
 * | `bounds` | error | the drawing goes out of the 24 × 24 square |
 * | `writing` | warning | the text is not written as `serializePath` writes it, plain or compact |
 * | `slope` | warning | a slanted line whose sides are not in a simple ratio, `p/q` with `q` at most 6: `1/2`, `2/3`, `5/4`, `6/5`… (a guideline, not a law) |
 *
 * The width of the strokes (2) and the rounded ends cannot be checked: they are left to the eye.
 *
 * @module svg-path
 */

// the number of values of each command (repeated for a command written once and used several times)
const ARITY = {m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0}
const NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y
const SEPARATOR = /[\s,]*/y
const ICON_SIZE = 24
const EPSILON = 1e-9

const isRelative = (command) => command === command.toLowerCase()

/**
 * Reads the `d` attribute of a path. Reading stops at the first error, as the browser draws a path up to its first
 * error: the segments read so far are returned with it.
 *
 * | Error code | Meaning |
 * | --- | --- |
 * | `start` | the path does not start with a move (`M` or `m`) |
 * | `character` | a character that is no command and no number |
 * | `number` | a number is missing after a command |
 * | `flag` | a flag of an arc is not `0` or `1` |
 *
 * @param {string} d - The `d` attribute.
 * @returns {{segments: Array<{command: string, values: number[]}>, errors: Array<{code: string, index: number, command?: string}>}}
 *   The segments, and the error (at most one) with the index of its character in `d`.
 */
export const parsePath = (d) => {
  const segments = []
  const errors = []
  let i = 0
  const skip = () => { SEPARATOR.lastIndex = i; SEPARATOR.exec(d); i = SEPARATOR.lastIndex }
  const readNumber = () => {
    NUMBER.lastIndex = i
    const match = NUMBER.exec(d)
    if (match === null) { return null }
    i = NUMBER.lastIndex
    return Number(match[0])
  }
  const readFlag = () => {
    if (d[i] !== '0' && d[i] !== '1') { return null }
    return Number(d[i++])
  }
  // the values of one use of a command; null when one is missing (the error is then recorded)
  const readValues = (command) => {
    const values = []
    const arity = ARITY[command.toLowerCase()]
    for (let k = 0; k < arity; k++) {
      if (k > 0) { skip() }
      const isFlag = command.toLowerCase() === 'a' && (k === 3 || k === 4)
      const value = isFlag ? readFlag() : readNumber()
      if (value === null) {
        errors.push({code: isFlag ? 'flag' : 'number', index: i, command})
        return null
      }
      values.push(value)
    }
    return values
  }
  skip()
  while (i < d.length && errors.length === 0) {
    const letter = d[i]
    const lower = letter.toLowerCase()
    if (ARITY[lower] === undefined || !/[a-z]/i.test(letter)) {
      errors.push({code: 'character', index: i})
      break
    }
    if (segments.length === 0 && lower !== 'm') {
      errors.push({code: 'start', index: i})
      break
    }
    i++
    skip()
    if (lower === 'z') {
      segments.push({command: letter, values: []})
      continue
    }
    let command = letter
    let first = true
    // the command, then its repetitions without letter
    while (first || /[-+.\d]/.test(d[i] ?? '')) {
      const values = readValues(command)
      if (values === null) { break }
      segments.push({command, values})
      skip()
      if (lower === 'm') { command = letter === 'm' ? 'l' : 'L' } // the pairs after a move are lines
      first = false
    }
  }
  return {segments, errors}
}

// a number, written as short as possible (no float noise, no -0)
const formatValue = (value, compact) => {
  let text = String(Number(value.toFixed(6)))
  if (text === '-0') { text = '0' }
  if (compact) { text = text.replace(/^(-?)0\./, '$1.') }
  return text
}

/**
 * Writes segments back as the `d` attribute of a path. A command that follows the same command is written without
 * its letter (`a1 1 0 0 1 2 0 1 1 0 0 1-2 0`), as the icon set does.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {{compact?: boolean}} [options] - `compact`: drop the zeros before the decimal point and the spaces they
 *   free (`.5.5` for `0.5 0.5`).
 * @returns {string} The `d` attribute.
 * @example
 * serializePath([{command: 'M', values: [0.5, 2]}, {command: 'l', values: [3, -0.5]}])  // 'M0.5 2l3-0.5'
 * serializePath(…, {compact: true})                                                      // 'M.5 2l3-.5'
 */
export const serializePath = (segments, {compact = false} = {}) => {
  let text = ''
  let previous = null // the last number written, null after a letter
  segments.forEach(({command, values}, index) => {
    // a command repeated without its letter, as the icon set writes it (never a move: it would turn into a line)
    const repeated = index > 0 && command === segments[index - 1].command && command.toLowerCase() !== 'm' &&
      command.toLowerCase() !== 'z'
    if (!repeated) {
      text += command
      previous = null
    }
    for (const value of values) {
      const number = formatValue(value, compact)
      const glued = previous === null || number.startsWith('-') ||
        (compact && number.startsWith('.') && previous.includes('.'))
      text += (glued ? '' : ' ') + number
      previous = number
    }
  })
  return text
}

// the centre of an arc (the endpoint parametrisation of the SVG specification, radii enlarged when too small)
const arcCenter = (x1, y1, [rx, ry, angle, large, sweep, x2, y2]) => {
  rx = Math.abs(rx)
  ry = Math.abs(ry)
  if (rx < EPSILON || ry < EPSILON) { return null }
  const phi = angle * Math.PI / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (x1 - x2) / 2
  const dy = (y1 - y2) / 2
  const x1p = cos * dx + sin * dy
  const y1p = -sin * dx + cos * dy
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda) }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p
  let coef = den === 0 ? 0 : Math.sqrt(Math.max(0, num / den))
  if (large === sweep) { coef = -coef }
  const cxp = coef * rx * y1p / ry
  const cyp = -coef * ry * x1p / rx
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2
  const vector = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const theta = vector(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
  let delta = vector((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
  if (!sweep && delta > 0) { delta -= 2 * Math.PI }
  if (sweep && delta < 0) { delta += 2 * Math.PI }
  return {x: cx, y: cy, rx, ry, phi, theta, delta}
}

/**
 * The points of each segment, absolute: where it starts, where it ends, its control points (curves) and the centre
 * of an arc. They are what an editor shows on the drawing.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @returns {Array<{start: {x: number, y: number}, end: {x: number, y: number}, controls: Array<{x: number, y: number}>, center?: {x: number, y: number}}>}
 *   One entry per segment.
 */
export const pathPoints = (segments) => {
  const points = []
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let lastControl = null // the last control point of a curve, for S and T
  segments.forEach(({command, values}, index) => {
    const relative = isRelative(command) && index > 0
    const lower = command.toLowerCase()
    const ox = relative ? x : 0
    const oy = relative ? y : 0
    const start = {x, y}
    const controls = []
    let center
    let control = null
    let ex = x
    let ey = y
    if (lower === 'm' || lower === 'l' || lower === 't') {
      ex = ox + values[0]
      ey = oy + values[1]
      if (lower === 't') {
        control = lastControl?.quadratic ? {x: 2 * x - lastControl.x, y: 2 * y - lastControl.y} : {x, y}
        controls.push(control)
        control = {...control, quadratic: true}
      }
    } else if (lower === 'h') {
      ex = (relative ? x : 0) + values[0]
    } else if (lower === 'v') {
      ey = (relative ? y : 0) + values[0]
    } else if (lower === 'c') {
      controls.push({x: ox + values[0], y: oy + values[1]}, {x: ox + values[2], y: oy + values[3]})
      ex = ox + values[4]
      ey = oy + values[5]
      control = {...controls[1], cubic: true}
    } else if (lower === 's') {
      const first = lastControl?.cubic ? {x: 2 * x - lastControl.x, y: 2 * y - lastControl.y} : {x, y}
      controls.push(first, {x: ox + values[0], y: oy + values[1]})
      ex = ox + values[2]
      ey = oy + values[3]
      control = {...controls[1], cubic: true}
    } else if (lower === 'q') {
      controls.push({x: ox + values[0], y: oy + values[1]})
      ex = ox + values[2]
      ey = oy + values[3]
      control = {...controls[0], quadratic: true}
    } else if (lower === 'a') {
      ex = ox + values[5]
      ey = oy + values[6]
      const arc = arcCenter(x, y, [values[0], values[1], values[2], values[3], values[4], ex, ey])
      if (arc !== null) { center = {x: arc.x, y: arc.y} }
    } else if (lower === 'z') {
      ex = startX
      ey = startY
    }
    if (lower === 'm') { startX = ex; startY = ey }
    lastControl = control
    x = ex
    y = ey
    const entry = {start, end: {x: ex, y: ey}, controls: controls.map(({x, y}) => ({x, y}))}
    if (center !== undefined) { entry.center = center }
    points.push(entry)
  })
  return points
}

// the segment written in the other mode: absolute (from the points) or relative (from its start)
const convert = (segment, point, toRelative, first) => {
  const lower = segment.command.toLowerCase()
  if (lower === 'z') { return {command: toRelative ? 'z' : 'Z', values: []} }
  const {start, end, controls} = point
  const ox = toRelative && !first ? start.x : 0
  const oy = toRelative && !first ? start.y : 0
  // the first move stays 'M': written 'm', it means the same
  const command = toRelative && !first ? lower : lower.toUpperCase()
  if (lower === 'h') { return {command, values: [end.x - ox]} }
  if (lower === 'v') { return {command, values: [end.y - oy]} }
  if (lower === 'a') {
    const [rx, ry, angle, large, sweep] = segment.values
    return {command, values: [rx, ry, angle, large, sweep, end.x - ox, end.y - oy]}
  }
  // the controls of S and T are implied: only the written ones are kept
  const written = lower === 'c' ? controls : lower === 's' ? controls.slice(1) : lower === 'q' ? controls : []
  return {command, values: [...written, end].flatMap(p => [p.x - ox, p.y - oy])}
}

const convertAll = (segments, indexes, toRelative) => {
  const points = pathPoints(segments)
  const chosen = indexes === undefined ? null : new Set([indexes].flat())
  return segments.map((segment, index) => chosen === null || chosen.has(index)
    ? convert(segment, points[index], toRelative, index === 0)
    : {command: segment.command, values: [...segment.values]})
}

/**
 * Writes the segments with absolute commands (upper case); the drawing does not change.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {number|number[]} [indexes] - The segments to convert (all by default).
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const toAbsolute = (segments, indexes) => convertAll(segments, indexes, false)

/**
 * Writes the segments with relative commands (lower case); the drawing does not change. The first move stays `M`
 * (a relative first move means the same).
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {number|number[]} [indexes] - The segments to convert (all by default).
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const toRelative = (segments, indexes) => convertAll(segments, indexes, true)

/**
 * Rounds the numbers of the segments (the flags of the arcs stay as they are).
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {number} [decimals=2] - The number of decimals kept.
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const roundPath = (segments, decimals = 2) => {
  const factor = 10 ** decimals
  const round = (value) => Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor
  return segments.map(({command, values}) => ({
    command,
    values: values.map((value, k) => command.toLowerCase() === 'a' && (k === 3 || k === 4) ? value : round(value) + 0)
  }))
}

// applies x' = a x + b y + e, y' = c x + d y + f, where (a, b, c, d) keeps the axes (a scale, a mirror or a quarter
// turn): the relative values only take the linear part
const transform = (segments, [a, b, c, d, e, f]) => {
  const swap = Math.abs(a) < EPSILON // a quarter turn: x comes from y and y from x
  const det = a * d - b * c
  const scale = Math.sqrt(Math.abs(det))
  const point = (x, y, relative) => [a * x + b * y + (relative ? 0 : e), c * x + d * y + (relative ? 0 : f)]
  const points = pathPoints(segments)
  return segments.map(({command, values}, index) => {
    const lower = command.toLowerCase()
    const relative = isRelative(command) && index > 0
    const upper = relative ? (s) => s : (s) => s.toUpperCase()
    if (lower === 'z') { return {command, values: []} }
    if (lower === 'h' || lower === 'v') {
      // an absolute H keeps the current y, which the transformation needs
      const {x, y} = points[index].end
      const [nx, ny] = relative
        ? point(lower === 'h' ? values[0] : 0, lower === 'v' ? values[0] : 0, true)
        : point(x, y, false)
      const horizontal = (lower === 'h') !== swap
      return {command: upper(horizontal ? 'h' : 'v'), values: [horizontal ? nx : ny]}
    }
    if (lower === 'a') {
      const [rx, ry, angle, large, sweep, x, y] = values
      // the axis of an ellipse turns; a circle has none
      let newAngle = swap && Math.abs(rx - ry) > EPSILON ? angle + 90 : angle
      if (det < 0) { newAngle = -newAngle }
      newAngle = ((newAngle % 180) + 180) % 180 // an ellipse turned by 180° is the same: kept within ]-90, 90]
      if (newAngle > 90) { newAngle -= 180 }
      return {command, values: [rx * scale, ry * scale, newAngle + 0, large, det < 0 ? 1 - sweep : sweep, ...point(x, y, relative)]}
    }
    const out = []
    for (let k = 0; k < values.length; k += 2) { out.push(...point(values[k], values[k + 1], relative)) }
    return {command, values: out}
  })
}

/**
 * Moves the drawing.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {number} dx - The move to the right.
 * @param {number} dy - The move down.
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const translatePath = (segments, dx, dy) => transform(segments, [1, 0, 0, 1, dx, dy])

/**
 * Scales the drawing around a centre.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {number} factor - The factor, greater than 0 (`0.5` halves the drawing).
 * @param {number} [cx=12] - The centre (it does not move).
 * @param {number} [cy=12] - The centre.
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const scalePath = (segments, factor, cx = 12, cy = 12) =>
  transform(segments, [factor, 0, 0, factor, cx * (1 - factor), cy * (1 - factor)])

/**
 * Turns the drawing a quarter turn clockwise around a centre.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {number} [cx=12] - The centre.
 * @param {number} [cy=12] - The centre.
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const rotatePath = (segments, cx = 12, cy = 12) => transform(segments, [0, -1, 1, 0, cx + cy, cy - cx])

/**
 * Mirrors the drawing: `x` swaps the left and the right, `y` the top and the bottom.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @param {'x'|'y'} axis - The coordinate that changes.
 * @param {number} [center=12] - The line of the mirror (`x = 12` or `y = 12`).
 * @returns {Array<{command: string, values: number[]}>} New segments.
 */
export const flipPath = (segments, axis, center = 12) => axis === 'x'
  ? transform(segments, [-1, 0, 0, 1, 2 * center, 0])
  : transform(segments, [1, 0, 0, -1, 0, 2 * center])

/**
 * Cleans a path into the writing of the icon set, without changing the drawing: every shape starts with an absolute
 * `M`, the other commands become relative (`Z` becomes `z`), a line that only goes across or down becomes `h` or
 * `v`, the commands that draw nothing (`l0 0`, `h0`, an arc to its own start) are removed, two `h` (or two `v`)
 * in a row going the same way are merged, and a line back to the start just before `z` is left to `z`.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @returns {Array<{command: string, values: number[]}>} New segments.
 * @example
 * serializePath(cleanPath(parsePath('M4 4L8 4l0 0h2h1V8H4z').segments))  // 'M4 4h7v4h-7z'
 */
export const cleanPath = (segments) => {
  const moves = []
  const others = []
  segments.forEach(({command}, index) => (command.toLowerCase() === 'm' ? moves : others).push(index))
  const relative = toAbsolute(toRelative(segments, others), moves)
  const zero = (value) => Math.abs(value) < EPSILON
  const out = []
  for (const {command, values} of relative) {
    let segment = {command, values: [...values]}
    if (command === 'l') {
      const [dx, dy] = values
      if (zero(dx) && zero(dy)) { continue }
      if (zero(dy)) { segment = {command: 'h', values: [dx]} } else if (zero(dx)) { segment = {command: 'v', values: [dy]} }
    } else if ((command === 'h' || command === 'v') && zero(values[0])) {
      continue
    } else if (command === 'a' && zero(values[5]) && zero(values[6])) {
      continue
    }
    // two horizontals (or verticals) in a row, the same way: one
    const previous = out.at(-1)
    if ((segment.command === 'h' || segment.command === 'v') && previous?.command === segment.command &&
      Math.sign(previous.values[0]) === Math.sign(segment.values[0])) {
      previous.values[0] += segment.values[0]
      continue
    }
    out.push(segment)
  }
  // a line back to the start of the shape just before z: z draws it
  const points = pathPoints(out)
  return out.filter((segment, index) => {
    const next = out[index + 1]
    if (next?.command !== 'z' || !['l', 'h', 'v'].includes(segment.command)) { return true }
    const shapeStart = points[index + 1].end // where z goes back to
    const {end} = points[index]
    return Math.hypot(end.x - shapeStart.x, end.y - shapeStart.y) > EPSILON
  })
}

// a segment drawn backwards, absolute: from the end of the original to its start (points: its pathPoints entry)
const backwards = (segment, {start, controls}) => {
  const lower = segment.command.toLowerCase()
  if (lower === 'h') { return {command: 'H', values: [start.x]} }
  if (lower === 'v') { return {command: 'V', values: [start.y]} }
  if (lower === 'a') {
    const [rx, ry, angle, large, sweep] = segment.values
    return {command: 'A', values: [rx, ry, angle, large, 1 - sweep, start.x, start.y]}
  }
  // the curves: controls written out (S and T become C and Q), in the other order
  if (lower === 'c' || lower === 's') {
    return {command: 'C', values: [controls[1].x, controls[1].y, controls[0].x, controls[0].y, start.x, start.y]}
  }
  if (lower === 'q' || lower === 't') { return {command: 'Q', values: [controls[0].x, controls[0].y, start.x, start.y]} }
  return {command: 'L', values: [start.x, start.y]}
}

/**
 * Draws each shape of the path the other way round: same drawing, opposite direction. A hole is drawn in the
 * direction opposite to its outline (the icon set uses the `nonzero` fill rule). Each command keeps its mode
 * (absolute or relative); `S` and `T` become `C` and `Q`; a closing `z` from a point other than the start becomes
 * an explicit line (horizontal or vertical when it can), drawn first. Every shape starts with an absolute `M`.
 *
 * @param {Array<{command: string, values: number[]}>} segments - The segments.
 * @returns {Array<{command: string, values: number[]}>} New segments.
 * @example
 * serializePath(reversePath(parsePath('M4 4h4v4z').segments))  // 'M4 4l4 4v-4h-4z'
 * serializePath(reversePath(parsePath('M2 2h2v2h-2z').segments)) // 'M2 2v2h2v-2h-2z'
 */
export const reversePath = (segments) => {
  const points = pathPoints(segments)
  const out = []
  let start = 0
  while (start < segments.length) {
    let end = start + 1
    while (end < segments.length && segments[end].command.toLowerCase() !== 'm') { end++ }
    // the shape: segments[start] (the move) to segments[end - 1]
    const closed = segments[end - 1].command.toLowerCase() === 'z'
    const last = closed ? end - 2 : end - 1 // the last drawing command
    const origin = points[start].end
    const reversed = []
    const relative = []
    if (closed) {
      const {x, y} = points[last]?.end ?? origin
      // the closing line, now drawn first
      const dx = Math.abs(x - origin.x) > EPSILON
      const dy = Math.abs(y - origin.y) > EPSILON
      if (dx || dy) {
        // horizontal or vertical when it can
        reversed.push(dx && dy ? {command: 'L', values: [x, y]} : dx ? {command: 'H', values: [x]} : {command: 'V', values: [y]})
        relative.push(isRelative(segments[end - 1].command))
      }
    }
    for (let index = last; index > start; index--) {
      reversed.push(backwards(segments[index], points[index]))
      relative.push(isRelative(segments[index].command))
    }
    const moveTo = closed ? origin : (points[last]?.end ?? origin)
    const shape = [{command: 'M', values: [moveTo.x, moveTo.y]}, ...reversed]
    if (closed) { shape.push({command: segments[end - 1].command, values: []}) }
    // each command back in its mode
    const indexes = relative.flatMap((r, k) => r ? [k + 1] : [])
    out.push(...(indexes.length > 0 ? toRelative(shape, indexes) : shape))
    start = end
  }
  return out
}

// the points drawn by a segment, enough to know whether it leaves the square (arcs and curves are sampled)
const samples = (segment, point) => {
  const lower = segment.command.toLowerCase()
  const {start, end, controls} = point
  const out = [end]
  if (lower === 'a') {
    const arc = arcCenter(start.x, start.y, [...segment.values.slice(0, 5), end.x, end.y])
    if (arc !== null) {
      for (let k = 1; k < 32; k++) {
        const t = arc.theta + arc.delta * k / 32
        const ux = arc.rx * Math.cos(t)
        const uy = arc.ry * Math.sin(t)
        out.push({x: arc.x + Math.cos(arc.phi) * ux - Math.sin(arc.phi) * uy, y: arc.y + Math.sin(arc.phi) * ux + Math.cos(arc.phi) * uy})
      }
    }
  } else if (controls.length > 0) {
    const all = [start, ...controls, end]
    for (let k = 1; k < 16; k++) {
      let level = all
      const t = k / 16
      while (level.length > 1) {
        level = level.slice(1).map((p, j) => ({x: level[j].x + (p.x - level[j].x) * t, y: level[j].y + (p.y - level[j].y) * t}))
      }
      out.push(level[0])
    }
  }
  return out
}

// the sides of a slanted line are in a simple ratio p/q (q from 1 to 6), within the rounding of two decimals: each
// side may be off by 0.005, so the ratio by 0.005 × (1 + ratio) / the short side (l2.12 0.71 is 3/1)
const MAX_DENOMINATOR = 6
const isSimpleRatio = (a, b) => {
  const short = Math.min(a, b)
  const ratio = Math.max(a, b) / short
  const tolerance = 0.005 * (1 + ratio) / short + EPSILON
  for (let q = 1; q <= MAX_DENOMINATOR; q++) {
    if (Math.abs(ratio - Math.round(ratio * q) / q) <= tolerance) { return true }
  }
  return false
}

/**
 * Checks a path against the drawing rules of the icon set (see the table above). An empty list means a path that
 * follows the rules.
 *
 * @param {string} d - The `d` attribute.
 * @returns {Array<{code: string, level: 'error'|'warning', segment?: number, error?: object}>} The breaches, in the
 *   order of the path.
 */
export const checkIconsetPath = (d) => {
  const {segments, errors} = parsePath(d)
  const issues = []
  if (errors.length > 0) {
    issues.push({code: 'syntax', level: 'error', error: errors[0]})
    return issues
  }
  if (segments.length === 0) { return [{code: 'empty', level: 'error'}] }
  const points = pathPoints(segments)
  let inShape = false
  segments.forEach((segment, index) => {
    const {command, values} = segment
    if (!inShape) {
      if (command !== 'M') { issues.push({code: 'shape-start', level: 'error', segment: index}) }
      inShape = true
    } else if (command === 'z') {
      inShape = false
    } else if (!['h', 'v', 'l', 'a'].includes(command)) {
      issues.push({code: 'command', level: 'error', segment: index})
    }
    if (values.some(value => Math.abs(value * 100 - Math.round(value * 100)) > 1e-6)) {
      issues.push({code: 'decimals', level: 'error', segment: index})
    }
    const out = samples(segment, points[index]).some(({x, y}) => x < -0.005 || y < -0.005 || x > ICON_SIZE + 0.005 || y > ICON_SIZE + 0.005)
    if (out) { issues.push({code: 'bounds', level: 'error', segment: index}) }
    if (command === 'l' && Math.abs(values[0]) > EPSILON && Math.abs(values[1]) > EPSILON &&
      !isSimpleRatio(Math.abs(values[0]), Math.abs(values[1]))) {
      issues.push({code: 'slope', level: 'warning', segment: index})
    }
  })
  if (inShape) { issues.push({code: 'shape-end', level: 'error', segment: segments.length - 1}) }
  if (d !== serializePath(segments) && d !== serializePath(segments, {compact: true})) {
    issues.push({code: 'writing', level: 'warning'})
  }
  return issues
}

// ////////////////////////////////////////////
// Inset: the outline moved inwards
// ////////////////////////////////////////////

// the geometric pieces of a closed shape: lines {type: 'line', a, b} and arcs of ellipse {type: 'arc', cx, cy, rx, ry,
// phi, theta, delta} (theta: parameter of the start, delta: signed span, > 0 with the sweep flag); null for a curve
const ellipsePoint = ({cx, cy, rx, ry, phi}, t) => ({
  x: cx + rx * Math.cos(t) * Math.cos(phi) - ry * Math.sin(t) * Math.sin(phi),
  y: cy + rx * Math.cos(t) * Math.sin(phi) + ry * Math.sin(t) * Math.cos(phi)
})
const ellipseParam = ({cx, cy, rx, ry, phi}, {x, y}) => {
  const dx = x - cx
  const dy = y - cy
  return Math.atan2((-dx * Math.sin(phi) + dy * Math.cos(phi)) / ry, (dx * Math.cos(phi) + dy * Math.sin(phi)) / rx)
}
// the direction of travel, unit
const unit = (x, y) => { const length = Math.hypot(x, y); return {x: x / length, y: y / length} }
const ellipseTangent = ({rx, ry, phi, delta}, t) => {
  const sign = delta >= 0 ? 1 : -1
  return unit(sign * (-rx * Math.sin(t) * Math.cos(phi) - ry * Math.cos(t) * Math.sin(phi)),
    sign * (-rx * Math.sin(t) * Math.sin(phi) + ry * Math.cos(t) * Math.cos(phi)))
}
const startTangent = (piece) => piece.type === 'line' ? unit(piece.b.x - piece.a.x, piece.b.y - piece.a.y) : ellipseTangent(piece, piece.theta)
const endTangent = (piece) => piece.type === 'line' ? unit(piece.b.x - piece.a.x, piece.b.y - piece.a.y) : ellipseTangent(piece, piece.theta + piece.delta)
const startPoint = (piece) => piece.type === 'line' ? piece.a : ellipsePoint(piece, piece.theta)
const endPoint = (piece) => piece.type === 'line' ? piece.b : ellipsePoint(piece, piece.theta + piece.delta)

const shapePieces = (segments) => {
  const absolute = toAbsolute(segments)
  const points = pathPoints(absolute)
  const pieces = []
  for (let index = 1; index < absolute.length; index++) {
    const {command, values} = absolute[index]
    const {start, end} = points[index]
    if (Math.hypot(end.x - start.x, end.y - start.y) < EPSILON) { continue }
    if (command === 'L' || command === 'H' || command === 'V' || command === 'Z') {
      pieces.push({type: 'line', a: start, b: end, segment: index})
    } else if (command === 'A') {
      const arc = arcCenter(start.x, start.y, [...values.slice(0, 5), end.x, end.y])
      if (arc === null) { pieces.push({type: 'line', a: start, b: end, segment: index}); continue }
      pieces.push({type: 'arc', cx: arc.x, cy: arc.y, rx: arc.rx, ry: arc.ry, phi: arc.phi, theta: arc.theta, delta: arc.delta, segment: index})
    } else {
      return null
    }
  }
  // the closing line, when z draws one
  const first = points[0].end
  const last = points.at(-1).end
  if (Math.hypot(last.x - first.x, last.y - first.y) > EPSILON) { pieces.push({type: 'line', a: last, b: first, segment: absolute.length - 1}) }
  return pieces
}

// a polyline along the pieces (arcs sampled), for the area and the crossings
const piecePolyline = (piece, steps = 24) => piece.type === 'line'
  ? [piece.a, piece.b]
  : Array.from({length: steps + 1}, (_, k) => ellipsePoint(piece, piece.theta + piece.delta * k / steps))

// the intersections of two pieces taken whole (infinite line, full ellipse)
const toUnit = (e, {x, y}) => {
  const dx = x - e.cx
  const dy = y - e.cy
  return {u: (dx * Math.cos(e.phi) + dy * Math.sin(e.phi)) / e.rx, v: (-dx * Math.sin(e.phi) + dy * Math.cos(e.phi)) / e.ry}
}
const intersections = (p, q) => {
  if (p.type === 'line' && q.type === 'line') {
    const d1 = {x: p.b.x - p.a.x, y: p.b.y - p.a.y}
    const d2 = {x: q.b.x - q.a.x, y: q.b.y - q.a.y}
    const den = d1.x * d2.y - d1.y * d2.x
    if (Math.abs(den) < EPSILON) { return [] }
    const s = ((q.a.x - p.a.x) * d2.y - (q.a.y - p.a.y) * d2.x) / den
    return [{x: p.a.x + s * d1.x, y: p.a.y + s * d1.y}]
  }
  if (p.type === 'arc' && q.type === 'line') { return intersections(q, p) }
  if (p.type === 'line') {
    // the line in the frame where the ellipse is the unit circle: a quadratic
    const a = toUnit(q, p.a)
    const b = toUnit(q, p.b)
    const du = b.u - a.u
    const dv = b.v - a.v
    const A = du * du + dv * dv
    const B = 2 * (a.u * du + a.v * dv)
    const C = a.u * a.u + a.v * a.v - 1
    let disc = B * B - 4 * A * C
    if (disc < 0) { if (disc > -1e-9) { disc = 0 } else { return [] } }
    return [-1, 1].map(sign => (-B + sign * Math.sqrt(disc)) / (2 * A))
      .map(s => ({x: p.a.x + s * (p.b.x - p.a.x), y: p.a.y + s * (p.b.y - p.a.y)}))
  }
  // two ellipses: the sign of the second one's equation along the first, then bisection
  const f = (t) => { const {u, v} = toUnit(q, ellipsePoint(p, t)); return u * u + v * v - 1 }
  const found = []
  const steps = 720
  for (let k = 0; k < steps; k++) {
    let t0 = 2 * Math.PI * k / steps
    let t1 = 2 * Math.PI * (k + 1) / steps
    let f0 = f(t0)
    if (Math.sign(f0) === Math.sign(f(t1))) { continue }
    for (let n = 0; n < 50; n++) {
      const tm = (t0 + t1) / 2
      const fm = f(tm)
      if (Math.sign(fm) === Math.sign(f0)) { t0 = tm; f0 = fm } else { t1 = tm }
    }
    found.push(ellipsePoint(p, (t0 + t1) / 2))
  }
  return found
}
const nearest = (points, target) => points.reduce((best, point) => best === null ||
  Math.hypot(point.x - target.x, point.y - target.y) < Math.hypot(best.x - target.x, best.y - target.y) ? point : best, null)

// do two segments of polylines cross (strictly)?
const crosses = (a, b, c, d) => {
  const side = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = side(c, d, a)
  const d2 = side(c, d, b)
  const d3 = side(a, b, c)
  const d4 = side(a, b, d)
  return d1 * d2 < -1e-9 && d3 * d4 < -1e-9
}

/**
 * The outline of a closed shape moved inwards by a distance: drawn the other way round, it is the hole that leaves a
 * stroke of that width (an icon's ring, frame or outline). The shape is made of lines and arcs (the icon set's
 * commands); curves are refused.
 *
 * - A line moves parallel to itself; an arc whose centre is inside keeps its centre, its radii shrink by the distance;
 *   an arc whose centre is outside grows by it.
 * - An arc whose smaller radius is not greater than the distance disappears: inside, the corner is sharp.
 * - At a corner that points outwards, the moved pieces are cut where they meet; at a corner that points inwards, they
 *   are joined by an arc of radius `distance` around the corner.
 * - A piece eaten by its neighbours (too short) is removed.
 * - The inner ellipse of an ellipse is the concentric one: its distance to the outline is only exact at the ends of
 *   the axes. The thinnest width is given as a warning when it is less than 98 % of the distance.
 *
 * | Error | Meaning |
 * | --- | --- |
 * | `shapes` | the path is not one shape `M…z` |
 * | `command` | a curve (`C`, `S`, `Q`, `T`) |
 * | `small` | the shape is too small: nothing is left inside |
 * | `join` | two moved pieces do not meet |
 * | `narrow` | the shape is too narrow in places: the hole would cross itself |
 *
 * @param {Array<{command: string, values: number[]}>} segments - One closed shape.
 * @param {number} [distance=2] - The width of the stroke left.
 * @returns {{segments: Array<{command: string, values: number[]}>, warnings: Array<{code: 'thin', segment: number, width: number}>} | {error: string}}
 *   The hole (absolute `M`, then relative commands, rounded to two decimals, the other way round), with the warnings;
 *   or the error.
 * @example
 * serializePath(insetPath(parsePath('M2 2h20v20h-20z').segments).segments)  // 'M4 4v16h16v-16z'
 */
export const insetPath = (segments, distance = 2) => {
  const moves = segments.filter(({command}) => command.toLowerCase() === 'm').length
  if (moves !== 1 || segments[0]?.command.toLowerCase() !== 'm') { return {error: 'shapes'} }
  const pieces = shapePieces(segments)
  if (pieces === null) { return {error: 'command'} }
  if (pieces.length < 2) { return {error: 'small'} }
  // the inside: the sign of the area (with y down, > 0 for a shape drawn clockwise on the screen)
  const outline = pieces.flatMap(piece => piecePolyline(piece).slice(1))
  const area = outline.reduce((sum, p, i) => { const q = outline[(i + 1) % outline.length]; return sum + p.x * q.y - q.x * p.y }, 0)
  const k = area > 0 ? 1 : -1
  const inward = ({x, y}) => ({x: -k * y * distance, y: k * x * distance}) // the inward offset for a direction
  // each piece moved inwards (an arc too small disappears)
  const moved = []
  const warnings = []
  for (const piece of pieces) {
    if (piece.type === 'line') {
      const n = inward(unit(piece.b.x - piece.a.x, piece.b.y - piece.a.y))
      moved.push({...piece, a: {x: piece.a.x + n.x, y: piece.a.y + n.y}, b: {x: piece.b.x + n.x, y: piece.b.y + n.y}, from: piece})
      continue
    }
    const middle = ellipsePoint(piece, piece.theta + piece.delta / 2)
    const n = inward(ellipseTangent(piece, piece.theta + piece.delta / 2))
    const convex = (piece.cx - middle.x) * n.x + (piece.cy - middle.y) * n.y > 0 // the centre is inside
    const change = convex ? -distance : distance
    if (convex && Math.min(piece.rx, piece.ry) <= distance + EPSILON) { continue }
    const inner = {...piece, rx: piece.rx + change, ry: piece.ry + change, from: piece}
    moved.push(inner)
    if (Math.abs(piece.rx - piece.ry) > EPSILON) {
      // the thinnest width between the ellipse and its concentric inner one, along the arc
      let width = Infinity
      for (let i = 0; i <= 32; i++) {
        const p = ellipsePoint(inner, inner.theta + inner.delta * i / 32)
        for (let j = 0; j <= 256; j++) {
          const o = ellipsePoint(piece, 2 * Math.PI * j / 256)
          width = Math.min(width, Math.hypot(o.x - p.x, o.y - p.y))
        }
      }
      if (width < 0.98 * distance) { warnings.push({code: 'thin', segment: piece.segment, width: Math.round(width * 100) / 100}) }
    }
  }
  if (moved.length < 2) { return {error: 'small'} }
  // the corners: cut where the moved pieces meet (pointing outwards) or a joining arc (pointing inwards); a piece whose
  // ends come in the wrong order is removed, and its neighbours meet instead
  const corner = (p, q) => {
    const t1 = endTangent(p.from)
    const t2 = startTangent(q.from)
    const cross = t1.x * t2.y - t1.y * t2.x
    const original = endPoint(p.from)
    const pEnd = endPoint(p)
    const qStart = startPoint(q)
    if (Math.hypot(pEnd.x - qStart.x, pEnd.y - qStart.y) < 1e-6) { return {point: pEnd} } // smooth: the ends meet
    const touching = Math.hypot(endPoint(p.from).x - startPoint(q.from).x, endPoint(p.from).y - startPoint(q.from).y) < 1e-6
    if (touching && k * cross < -1e-9) {
      return {point: pEnd, round: {to: qStart, sweep: cross > 0 ? 1 : 0}} // inwards: an arc around the corner
    }
    const found = intersections(p, q)
    // two parallel lines: the sides are closer than twice the distance, nothing is left between them
    if (found.length === 0 && p.type === 'line' && q.type === 'line') { return {small: true} }
    const point = nearest(found, touching ? original : {x: (pEnd.x + qStart.x) / 2, y: (pEnd.y + qStart.y) / 2})
    return point === null ? null : {point}
  }
  let pieces2 = moved
  let corners
  for (let pass = 0; ; pass++) {
    if (pieces2.length < 2 || pass > 100) { return {error: 'small'} }
    corners = pieces2.map((piece, i) => corner(piece, pieces2[(i + 1) % pieces2.length]))
    if (corners.some(c => c === null)) { return {error: 'join'} }
    if (corners.some(c => c.small)) { return {error: 'small'} }
    // a piece reversed by its corners
    const reversed = pieces2.findIndex((piece, i) => {
      const start = corners[(i - 1 + pieces2.length) % pieces2.length].round?.to ?? corners[(i - 1 + pieces2.length) % pieces2.length].point
      const end = corners[i].point
      if (piece.type === 'line') {
        const d = unit(piece.b.x - piece.a.x, piece.b.y - piece.a.y)
        return (end.x - start.x) * d.x + (end.y - start.y) * d.y < -1e-6
      }
      const span = Math.abs(piece.delta)
      let swept = (ellipseParam(piece, end) - ellipseParam(piece, start)) * Math.sign(piece.delta)
      swept = ((swept % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      return swept > span + 1e-6 && swept > Math.PI
    })
    if (reversed < 0) { break }
    pieces2 = pieces2.filter((_, i) => i !== reversed)
  }
  // the hole, drawn the same way as the shape
  const out = []
  const n = pieces2.length
  const startOf = (i) => corners[(i - 1 + n) % n].round?.to ?? corners[(i - 1 + n) % n].point
  out.push({command: 'M', values: [startOf(0).x, startOf(0).y]})
  pieces2.forEach((piece, i) => {
    const start = startOf(i)
    const end = corners[i].point
    if (piece.type === 'line') {
      // the last line back to the start: drawn by z
      if (i < n - 1 || corners[i].round !== undefined) { out.push({command: 'L', values: [end.x, end.y]}) }
    } else {
      let swept = (ellipseParam(piece, end) - ellipseParam(piece, start)) * Math.sign(piece.delta)
      swept = ((swept % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      out.push({command: 'A', values: [piece.rx, piece.ry, piece.phi * 180 / Math.PI, swept > Math.PI ? 1 : 0, piece.delta > 0 ? 1 : 0, end.x, end.y]})
    }
    const round = corners[i].round
    if (round !== undefined) { out.push({command: 'A', values: [distance, distance, 0, 0, round.sweep, round.to.x, round.to.y]}) }
  })
  out.push({command: 'Z', values: []})
  // a hole that crosses itself: the shape is too narrow somewhere
  const polyline = pathPoints(out).flatMap((point, index) => {
    const segment = out[index]
    if (segment.command !== 'A') { return [point.end] }
    return samples(segment, point).slice(1).concat([point.end])
  })
  for (let i = 0; i < polyline.length - 1; i++) {
    for (let j = i + 2; j < polyline.length - 1; j++) {
      if (i === 0 && j === polyline.length - 2) { continue }
      if (crosses(polyline[i], polyline[i + 1], polyline[j], polyline[j + 1])) { return {error: 'narrow'} }
    }
  }
  return {segments: roundPath(cleanPath(reversePath(out))), warnings}
}
