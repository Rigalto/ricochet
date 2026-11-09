// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-svg-path.mjs — node tests/run.mjs SvgPath
// The `d` attribute of a path: reading (errors, compact writing, repeated commands), writing, points, absolute and
// relative commands, rounding, transformations, and the rules of the icon set.

import {describe, assert} from './kernel.mjs'
import {parsePath, serializePath, pathPoints, toAbsolute, toRelative, roundPath, translatePath, scalePath, rotatePath,
  flipPath, checkIconsetPath} from '../src/utils/svg-path.mjs'
import {iconset, iconsetList} from '../src/icons/iconset.mjs'

const BAR = 'M4 11h16a1 1 0 0 1 0 2h-16a1 1 0 0 1 0-2z' // a horizontal bar with rounded ends
const write = (d, transform) => serializePath(roundPath(transform(parsePath(d).segments)))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

describe('SvgPath — reading', () => {
  const {segments, errors} = parsePath(BAR)
  assert('a valid path: no error', errors.length === 0)
  assert('one segment per command', segments.length === 6 && segments[1].command === 'h' && same(segments[1].values, [16]))
  assert('the arcs: seven values', same(segments[2].values, [1, 1, 0, 0, 1, 0, 2]))
  const compact = parsePath('M.5.5l1.5-.5a1 1 0 011 1z')
  assert('compact writing: .5.5, -.5, flags glued', compact.errors.length === 0 &&
    same(compact.segments[0].values, [0.5, 0.5]) && same(compact.segments[1].values, [1.5, -0.5]) &&
    same(compact.segments[2].values, [1, 1, 0, 0, 1, 1, 1]))
  const repeated = parsePath('M1 2 3 4l1 1 2 2')
  assert('pairs after a move are lines, repeated commands give segments',
    same(repeated.segments.map(s => s.command), ['M', 'L', 'l', 'l']))
  assert('commas and spaces are separators', same(parsePath('M1,2 , 3 4').segments[1].values, [3, 4]))
  assert('exponents', parsePath('M1e1 2E-1').segments[0].values[0] === 10)
  assert('error: not starting with a move', same(parsePath('L1 2').errors, [{code: 'start', index: 0}]))
  assert('error: unknown character, segments read so far kept',
    same(parsePath('M1 2 X').errors, [{code: 'character', index: 5}]) && parsePath('M1 2 X').segments.length === 1)
  assert('error: missing number', parsePath('M1').errors[0].code === 'number')
  assert('error: bad flag', parsePath('M0 0a1 1 0 2 1 1 1').errors[0].code === 'flag')
  assert('empty path: nothing', parsePath('').segments.length === 0 && parsePath('').errors.length === 0)
})

describe('SvgPath — writing', () => {
  assert('read then written: the same text', serializePath(parsePath(BAR).segments) === BAR)
  const segments = [{command: 'M', values: [0.5, 2]}, {command: 'l', values: [3, -0.5]}, {command: 'l', values: [0.25, 0.5]}]
  assert('no space before a minus sign, repeated command without letter', serializePath(segments) === 'M0.5 2l3-0.5 0.25 0.5')
  assert('compact: no zero before the point, no space before a second point',
    serializePath(segments, {compact: true}) === 'M.5 2l3-.5.25.5')
  assert('a move is never written without its letter',
    serializePath([{command: 'M', values: [1, 1]}, {command: 'z', values: []}, {command: 'M', values: [2, 2]}]) === 'M1 1zM2 2')
  assert('no float noise, no -0', serializePath([{command: 'M', values: [0.1 + 0.2, -0]}]) === 'M0.3 0')
  const all = iconsetList.filter(name => {
    const {segments} = parsePath(iconset[name])
    return [serializePath(segments), serializePath(segments, {compact: true})].includes(iconset[name])
  })
  assert(`most icons are written back as they are (${all.length} of ${iconsetList.length})`, all.length > iconsetList.length * 0.95)
})

describe('SvgPath — points', () => {
  const points = pathPoints(parsePath(BAR).segments)
  assert('start and end of each segment', same(points[1].start, {x: 4, y: 11}) && same(points[1].end, {x: 20, y: 11}))
  assert('the centre of an arc', same(points[2].center, {x: 20, y: 12}))
  assert('z goes back to the start of the shape', same(points[5].end, {x: 4, y: 11}))
  const curves = pathPoints(parsePath('M0 0C1 1 2 1 3 0S5-1 6 0Q7 1 8 0T10 0').segments)
  assert('controls of C', same(curves[1].controls, [{x: 1, y: 1}, {x: 2, y: 1}]))
  assert('the first control of S is the reflection', same(curves[2].controls[0], {x: 4, y: -1}))
  assert('the control of T is the reflection', same(curves[4].controls[0], {x: 9, y: -1}))
})

describe('SvgPath — absolute and relative', () => {
  const segments = parsePath(BAR).segments
  const absolute = toAbsolute(segments)
  assert('all absolute', serializePath(absolute) === 'M4 11H20A1 1 0 0 1 20 13H4A1 1 0 0 1 4 11Z')
  assert('back to relative: the same path', serializePath(toRelative(absolute)) === BAR)
  assert('one segment only', serializePath(toAbsolute(segments, 1)) === 'M4 11H20a1 1 0 0 1 0 2h-16a1 1 0 0 1 0-2z')
  assert('the first move stays M', toRelative(absolute)[0].command === 'M')
  assert('the drawing does not change', same(pathPoints(absolute).map(p => p.end), pathPoints(segments).map(p => p.end)))
})

describe('SvgPath — rounding and transformations', () => {
  assert('two decimals, flags kept', serializePath(roundPath([{command: 'M', values: [1.005, -2.3349]},
    {command: 'a', values: [1.111, 1, 0, 1, 0, 2.999, 0]}])) === 'M1.01-2.33a1.11 1 0 1 0 3 0')
  assert('move: only the absolute commands change', write(BAR, s => translatePath(s, 1, -1)) ===
    'M5 10h16a1 1 0 0 1 0 2h-16a1 1 0 0 1 0-2z')
  assert('scale around the origin: radii follow', write(BAR, s => scalePath(s, 0.5, 0, 0)) ===
    'M2 5.5h8a0.5 0.5 0 0 1 0 1h-8a0.5 0.5 0 0 1 0-1z')
  assert('scale around the centre', write('M2 2h20v20h-20z', s => scalePath(s, 0.5)) === 'M7 7h10v10h-10z')
  assert('quarter turn clockwise: h becomes v, the right goes to the bottom', write(BAR, rotatePath) ===
    'M13 4v16a1 1 0 0 1-2 0v-16a1 1 0 0 1 2 0z')
  assert('quarter turn of absolute H and V', write('M2 2H22V4', rotatePath) === 'M22 2V22H20')
  assert('mirror x: the sweep of the arcs reverses', write(BAR, s => flipPath(s, 'x')) ===
    'M20 11h-16a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2z')
  assert('mirror y', write('M2 2l2 4z', s => flipPath(s, 'y')) === 'M2 22l2-4z')
  assert('the axis of an ellipse turns with it, kept in ]-90, 90]', write('M0 0a2 1 30 0 1 4 0', rotatePath) ===
    'M24 0a2 1 -60 0 1 0 4'.replace(' -60', '-60'))
  const icons = iconsetList.filter(name => {
    const {segments} = parsePath(iconset[name])
    let turned = segments
    for (let k = 0; k < 4; k++) { turned = rotatePath(turned) }
    return serializePath(roundPath(turned)) !== serializePath(roundPath(segments)) ||
      serializePath(roundPath(flipPath(flipPath(segments, 'x'), 'x'))) !== serializePath(roundPath(segments))
  })
  assert(`every icon: four quarter turns or two mirrors give it back (${icons.join(', ') || 'all'})`, icons.length === 0)
})

describe('SvgPath — icon set rules', () => {
  const codes = (d) => checkIconsetPath(d).map(issue => issue.code)
  assert('a path that follows the rules: nothing', codes(BAR).length === 0)
  assert('compact writing accepted', codes('M4 11h16a.5.5 0 0 1 0 1h-16a.5.5 0 0 1 0-1z').length === 0)
  assert('syntax: the error of the reading', checkIconsetPath('M4 11h').length === 1 && codes('M4 11h')[0] === 'syntax')
  assert('empty', same(codes(''), ['empty']))
  assert('a shape not starting with M', codes('M4 4h2zm2 2h2z').includes('shape-start'))
  assert('a shape not closed', same(codes('M4 4h2v2'), ['shape-end']))
  assert('a forbidden command, with its segment', same(checkIconsetPath('M4 4c1 1 2 2 3 3z'),
    [{code: 'command', level: 'error', segment: 1}]))
  assert('more than two decimals', same(codes('M4 11h16.125v2h-16z'), ['decimals']))
  assert('out of the square', codes('M20 4h6v2h-6z').every(code => code === 'bounds'))
  assert('an arc going out of the square', codes('M0 12a1 1 0 0 1 2 0z').length === 0 &&
    codes('M0 12a1 1 0 0 0 2 0z').length === 0 && codes('M0 0.5a1 1 0 0 1 2 0z').includes('bounds'))
  assert('writing: a space before a minus sign is a warning', same(checkIconsetPath('M4 4h2 -1z'),
    [{code: 'writing', level: 'warning'}]))
  assert('slope: integer ratio accepted, other ratio a warning', codes('M4 4l2 4-2-4z').length === 0 &&
    same(checkIconsetPath('M4 4l2 3h-2z'), [{code: 'slope', level: 'warning', segment: 1}]))
})
