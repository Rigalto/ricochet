// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-svg-path.mjs — node tests/run.mjs SvgPath
// The `d` attribute of a path: reading (errors, compact writing, repeated commands), writing, points, absolute and
// relative commands, rounding, transformations, and the rules of the icon set.

import {describe, assert} from './kernel.mjs'
import {parsePath, serializePath, pathPoints, toAbsolute, toRelative, roundPath, translatePath, scalePath, rotatePath,
  flipPath, reversePath, cleanPath, insetPath, checkIconsetPath} from '../src/utils/svg-path.mjs'
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
  assert('slope: simple ratios accepted (2/1, 3/2, 6/5, 5/6)', codes('M4 4l2 4-2-4z').length === 0 &&
    codes('M4 4l2 3h-2z').length === 0 && codes('M4 4l6 5h-6z').length === 0 && codes('M4 4l5 6h-5z').length === 0)
  assert('slope: within the rounding of two decimals (l2.12 0.71 is 3/1)', codes('M4 4l2.12 0.71h-2.12z').length === 0)
  assert('slope: other ratio a warning (9/7, 7/3.1)', same(checkIconsetPath('M4 4l7 9h-7z'), [{code: 'slope', level: 'warning', segment: 1}]) &&
    same(checkIconsetPath('M4 4l3.1 7h-3.1z'), [{code: 'slope', level: 'warning', segment: 1}]))
})

describe('SvgPath — reversing', () => {
  const reverse = (d) => serializePath(roundPath(reversePath(parsePath(d).segments)))
  assert('a bar with rounded ends: arcs with the other sweep', reverse(BAR) === 'M4 11a1 1 0 0 0 0 2h16a1 1 0 0 0 0-2h-16z')
  assert('the closing line becomes the first command, horizontal or vertical', reverse('M2 2h2v2h-2z') === 'M2 2v2h2v-2h-2z' &&
    reverse('M4 4h4v4z') === 'M4 4l4 4v-4h-4z')
  assert('an open shape starts at its end', reverse('M2 2l4 4') === 'M6 6l-4-4')
  assert('each shape on its own, starting with M', reverse('M4 4h4v4zm6 6h2v2h-2z') === 'M4 4l4 4v-4h-4zM10 10v2h2v-2h-2z')
  assert('curves: controls in the other order, S becomes C', reverse('M0 0C1 1 2 1 3 0S5-1 6 0') === 'M6 0C5-1 4-1 3 0 2 1 1 1 0 0')
  assert('reversed twice: the same path (closing line already drawn)', reverse(reverse(BAR)) === BAR)
  // a closing z that drew a line gets it written out the first time: from then on, reversing twice changes nothing
  const changed = iconsetList.filter(name => {
    const twice = reversePath(reversePath(parsePath(iconset[name]).segments))
    return serializePath(roundPath(reversePath(reversePath(twice)))) !== serializePath(roundPath(twice))
  })
  assert(`every icon: reversed four times as twice (${changed.slice(0, 5).join(', ') || 'all'})`, changed.length === 0)
})

describe('SvgPath — cleaning', () => {
  const clean = (d) => serializePath(roundPath(cleanPath(parsePath(d).segments)))
  assert('absolute lines become h and v, nothing useless, merged', clean('M4 4L8 4l0 0h2h1V8H4z') === 'M4 4h7v4h-7z')
  assert('every shape starts with M, Z becomes z', clean('M4 4h2v2h-2Zm6 0h2v2h-2z') === 'M4 4h2v2h-2zM10 4h2v2h-2z')
  assert('the pairs after M (absolute lines) become relative', clean('M17 8 14.16 5.16a1 1 0 0 1 2 0z') === 'M17 8l-2.84-2.84a1 1 0 0 1 2 0z')
  assert('an arc to its own start is removed, two h going opposite ways are kept', clean('M4 4a1 1 0 0 1 0 0h2h-1z') === 'M4 4h2-1z')
  assert('a clean path stays the same', clean(BAR) === BAR)
  // the points reached, without the closing ones and the repeated ones, within 0.001
  const reached = (s) => pathPoints(s).filter((_, i) => s[i].command.toLowerCase() !== 'z').map(({end}) => end)
    .filter((p, i, all) => i === 0 || Math.hypot(p.x - all[i - 1].x, p.y - all[i - 1].y) > 0.001)
  const changed = iconsetList.filter(name => {
    const {segments} = parsePath(iconset[name])
    const before = reached(segments)
    // merged lines skip a point in the middle: every point reached once cleaned was reached before, in the same order
    let k = 0
    return !reached(cleanPath(segments)).every(p => {
      while (k < before.length && Math.hypot(p.x - before[k].x, p.y - before[k].y) > 0.001) { k++ }
      return k++ < before.length
    })
  })
  assert(`every icon: once cleaned, the same points (merged lines skip some) (${changed.slice(0, 5).join(', ') || 'all'})`, changed.length === 0)
})

describe('SvgPath — inset', () => {
  const inset = (d, distance) => {
    const result = insetPath(parsePath(d).segments, distance)
    return result.error ?? serializePath(result.segments)
  }
  assert('a square: the hole, the other way round', inset('M2 2h20v20h-20z') === 'M4 4v16h16v-16z')
  assert('another width', inset('M2 2h20v20h-20z', 1) === 'M3 3v18h18v-18z')
  assert('a circle: radius minus the width', inset('M12 2a10 10 0 0 1 0 20a10 10 0 0 1 0-20z') === 'M12 4a8 8 0 0 0 0 16 8 8 0 0 0 0-16z')
  assert('rounded corners: radius 3 becomes 1', inset('M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3h-14a3 3 0 0 1-3-3v-14a3 3 0 0 1 3-3z') ===
    'M5 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-14a1 1 0 0 0-1-1z')
  assert('corners of radius 2 or less: sharp inside', inset('M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-16a2 2 0 0 1 2-2z') ===
    'M4 4v16h16v-16z')
  assert('a corner pointing inwards: an arc around it', inset('M2 2h20v20h-8v-10h-4v10h-8z') ===
    'M4 4v16h4v-8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8h4v-16z')
  const ellipse = insetPath(parsePath('M12 3a5 9 0 0 1 0 18a5 9 0 0 1 0-18z').segments)
  assert('an ellipse: the concentric one, the thinnest width as a warning', serializePath(ellipse.segments) ===
    'M12 5a3 7 0 0 0 0 14 3 7 0 0 0 0-14z' && ellipse.warnings.length === 2 && ellipse.warnings[0].width === 1.88)
  assert('the hole of an icon follows the rules', checkIconsetPath(inset('M2 22l10-20 10 20z')).every(issue => issue.level !== 'error'))
  assert('too thin: nothing left', inset('M4 11h16a1 1 0 0 1 0 2h-16a1 1 0 0 1 0-2z') === 'small' && inset('M2 2h20v3h-20z') === 'small')
  // a quadrilateral with corners of radius 2 (the corner tool), whose path starts at a corner, not where it ends: z
  // goes back over the first line; the hole's corners are the centres of the arcs
  const quad = 'M8.85 9.68l-6.86 5.48 6.84 6.84 5.48-6.86z'
  assert('a path going back over its first line', inset('M9 7l6.73 6.73a2 2 0 0 1 0.15 2.66l-5.48 6.86a2 2 0 0 1-2.98 0.17' +
    'l-6.84-6.84a2 2 0 0 1 0.16-2.98l6.86-5.48a2 2 0 0 1 2.66 0.15z') === 'M14.32 15.14l-5.47-5.46-6.86 5.48 6.84 6.84z' &&
    inset('M10.26 8.27l5.47 5.46a2 2 0 0 1 0.15 2.66l-5.48 6.86a2 2 0 0 1-2.98 0.17l-6.84-6.84a2 2 0 0 1 0.16-2.98' +
    'l6.86-5.48a2 2 0 0 1 2.66 0.15z') === quad)
  assert('two lines in a row on the same straight line: one', inset('M2 2h10h10v20h-20z') === 'M4 4v16h16v-16z')
  assert('a narrow waist: the hole would cross itself', inset('M2 2h20l-9 10 9 10h-20l9-10z') === 'narrow')
  assert('a curve: refused', inset('M2 2C4 4 6 6 8 8z') === 'command')
  assert('two shapes: refused', inset('M3 3h18v18h-18zM5 5h1v1h-1z') === 'shapes')
})
