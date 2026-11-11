# svg-path

Module `svg-path` · group `utils` · source [`src/utils/svg-path.mjs`](../../src/utils/svg-path.mjs)

The `d` attribute of an SVG `<path>`, as a list of segments: read it (with the place of the first error), write it
back (plain or compact), turn its commands absolute or relative, round its numbers, move, scale, turn or mirror it,
and check it against the drawing rules of the icon set ([iconset](iconset.module.md)). No DOM: it runs in a page or
in Node.

```javascript
import {parsePath, serializePath, rotatePath, checkIconsetPath} from 'ricochet/ricochet-utils.mjs'

const {segments, errors} = parsePath('M4 11h16a1 1 0 0 1 0 2h-16a1 1 0 0 1 0-2z')
serializePath(rotatePath(segments))           // 'M13 4v16a1 1 0 0 1-2 0v-16a1 1 0 0 1 2 0z'
checkIconsetPath('M4 11h16.125v2h-16z')      // [{code: 'decimals', level: 'error', segment: 1}]
```

## Segments

A segment is `{command, values}`: the letter of the command, upper case when absolute, lower case when relative,
and its numbers in the order of the SVG syntax. A command repeated without its letter (`l1 2 3 4`) gives one segment
per repetition; the pairs after a move (`M1 2 3 4`) are lines (`L`, or `l` after `m`).

| Command | Values |
| --- | --- |
| `M` `L` `T` | `x y` |
| `H` / `V` | `x` / `y` |
| `C` | `x1 y1 x2 y2 x y` |
| `S` `Q` | `x1 y1 x y` |
| `A` | `rx ry angle large-arc sweep x y` |
| `Z` | none |

The functions never change the segments they are given: they return new ones.

## Writing

`serializePath` writes the letter, then the numbers separated by a space, with no space before a minus sign
(`l4.08-4.08`), the style of the icon set. The compact writing also drops the zero before the decimal point (`.28`,
`-.5`) and the space before a number starting with a point when the previous one already has its own (`1.5.5`): the
writing of the minifiers, a few bytes less. Both are read back the same.

## Transformations

`insetPath` moves the outline of a shape inwards: drawn the other way round, the hole that leaves a stroke.

`cleanPath` rewrites a path in the writing of the icon set (relative commands, `h` and `v`, nothing useless).

`reversePath` draws each shape the other way round (a hole goes in the direction opposite to its outline).

Moving, scaling, turning a quarter turn and mirroring keep each command absolute or relative, and keep the
horizontal and vertical lines horizontal or vertical (a quarter turn makes an `h` a `v`). The arcs follow: radii
scaled, axis turned, sweep reversed by a mirror. The first move of a path is absolute even when written `m`.
Coordinates are those of the screen: `y` goes down, so a quarter turn clockwise sends the right to the bottom. The
centre is `12 12` by default, the middle of an icon.

## Icon set rules

`checkIconsetPath(d)` lists what breaks the rules of the icon set, each with its level and, when it has one, the
index of the segment at fault:

| Code | Level | Rule |
| --- | --- | --- |
| `syntax` | error | the path is not valid SVG (`error`: the error of `parsePath`) |
| `empty` | error | there is no shape |
| `shape-start` | error | a shape does not start with `M` |
| `shape-end` | error | a shape does not end with `z` |
| `command` | error | a command other than `h`, `v`, `l` and `a` inside a shape |
| `decimals` | error | a number with more than two decimals |
| `bounds` | error | the drawing goes out of the 24 × 24 square |
| `writing` | warning | the text is not written as `serializePath` writes it, plain or compact |
| `slope` | warning | a slanted line whose sides are not in a simple ratio, `p/q` with `q` at most 6: `1/2`, `2/3`, `5/4`, `6/5`… (a guideline, not a law) |

The width of the strokes (2) and the rounded ends cannot be checked: they are left to the eye.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `parsePath` | function | Reads the `d` attribute of a path. Reading stops at the first error, as the browser draws a path up to its first error: the segments read so far are returned with it. |
| `serializePath` | function | Writes segments back as the `d` attribute of a path. A command that follows the same command is written without its letter (`a1 1 0 0 1 2 0 1 1 0 0 1-2 0`), as the icon set does. |
| `pathPoints` | function | The points of each segment, absolute: where it starts, where it ends, its control points (curves) and the centre of an arc. They are what an editor shows on the drawing. |
| `toAbsolute` | function | Writes the segments with absolute commands (upper case); the drawing does not change. |
| `toRelative` | function | Writes the segments with relative commands (lower case); the drawing does not change. The first move stays `M` (a relative first move means the same). |
| `roundPath` | function | Rounds the numbers of the segments (the flags of the arcs stay as they are). |
| `translatePath` | function | Moves the drawing. |
| `scalePath` | function | Scales the drawing around a centre. |
| `rotatePath` | function | Turns the drawing a quarter turn clockwise around a centre. |
| `flipPath` | function | Mirrors the drawing: `x` swaps the left and the right, `y` the top and the bottom. |
| `cleanPath` | function | Cleans a path into the writing of the icon set, without changing the drawing: every shape starts with an absolute `M`, the other commands become relative (`Z` becomes `z`), a line that only goes across or down becomes `h` or `v`, the commands that draw nothing (`l0 0`, `h0`, an arc to its own start) are removed, two `h` (or two `v`) in a row going the same way are merged, and a line back to the start just before `z` is left to `z`. |
| `reversePath` | function | Draws each shape of the path the other way round: same drawing, opposite direction. A hole is drawn in the direction opposite to its outline (the icon set uses the `nonzero` fill rule). Each command keeps its mode (absolute or relative); `S` and `T` become `C` and `Q`; a closing `z` from a point other than the start becomes an explicit line (horizontal or vertical when it can), drawn first. Every shape starts with an absolute `M`. |
| `checkIconsetPath` | function | Checks a path against the drawing rules of the icon set (see the table above). An empty list means a path that follows the rules. |
| `insetPath` | function | The outline of a closed shape moved inwards by a distance: drawn the other way round, it is the hole that leaves a stroke of that width (an icon's ring, frame or outline). The shape is made of lines and arcs (the icon set's commands); curves are refused. |

## Details

### parsePath()

Reads the `d` attribute of a path. Reading stops at the first error, as the browser draws a path up to its first
error: the segments read so far are returned with it.

| Error code | Meaning |
| --- | --- |
| `start` | the path does not start with a move (`M` or `m`) |
| `character` | a character that is no command and no number |
| `number` | a number is missing after a command |
| `flag` | a flag of an arc is not `0` or `1` |

| Parameter | Type | Description |
| --- | --- | --- |
| `d` | string | The `d` attribute. |

**Returns** `{segments: Array<{command: string, values: number[]}>, errors: Array<{code: string, index: number, command?: string}>}` The segments, and the error (at most one) with the index of its character in `d`.

### serializePath()

Writes segments back as the `d` attribute of a path. A command that follows the same command is written without
its letter (`a1 1 0 0 1 2 0 1 1 0 0 1-2 0`), as the icon set does.

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |
| `options` | {compact?: boolean} | `compact`: drop the zeros before the decimal point and the spaces they free (`.5.5` for `0.5 0.5`). |

**Returns** `string` The `d` attribute.

### pathPoints()

The points of each segment, absolute: where it starts, where it ends, its control points (curves) and the centre
of an arc. They are what an editor shows on the drawing.

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |

**Returns** `Array<{start: {x: number, y: number}, end: {x: number, y: number}, controls: Array<{x: number, y: number}>, center?: {x: number, y: number}}>` One entry per segment.

### toAbsolute()

Writes the segments with absolute commands (upper case); the drawing does not change.

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |
| `indexes` | number\|number[] | The segments to convert (all by default). |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### toRelative()

Writes the segments with relative commands (lower case); the drawing does not change. The first move stays `M`
(a relative first move means the same).

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |
| `indexes` | number\|number[] | The segments to convert (all by default). |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### roundPath()

Rounds the numbers of the segments (the flags of the arcs stay as they are).

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> |  | The segments. |
| `decimals` | number | `2` | The number of decimals kept. |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### translatePath()

Moves the drawing.

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |
| `dx` | number | The move to the right. |
| `dy` | number | The move down. |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### scalePath()

Scales the drawing around a centre.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> |  | The segments. |
| `factor` | number |  | The factor, greater than 0 (`0.5` halves the drawing). |
| `cx` | number | `12` | The centre (it does not move). |
| `cy` | number | `12` | The centre. |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### rotatePath()

Turns the drawing a quarter turn clockwise around a centre.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> |  | The segments. |
| `cx` | number | `12` | The centre. |
| `cy` | number | `12` | The centre. |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### flipPath()

Mirrors the drawing: `x` swaps the left and the right, `y` the top and the bottom.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> |  | The segments. |
| `axis` | 'x'\|'y' |  | The coordinate that changes. |
| `center` | number | `12` | The line of the mirror (`x = 12` or `y = 12`). |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### cleanPath()

Cleans a path into the writing of the icon set, without changing the drawing: every shape starts with an absolute
`M`, the other commands become relative (`Z` becomes `z`), a line that only goes across or down becomes `h` or
`v`, the commands that draw nothing (`l0 0`, `h0`, an arc to its own start) are removed, two `h` (or two `v`)
in a row going the same way are merged, and a line back to the start just before `z` is left to `z`.

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### reversePath()

Draws each shape of the path the other way round: same drawing, opposite direction. A hole is drawn in the
direction opposite to its outline (the icon set uses the `nonzero` fill rule). Each command keeps its mode
(absolute or relative); `S` and `T` become `C` and `Q`; a closing `z` from a point other than the start becomes
an explicit line (horizontal or vertical when it can), drawn first. Every shape starts with an absolute `M`.

| Parameter | Type | Description |
| --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> | The segments. |

**Returns** `Array<{command: string, values: number[]}>` New segments.

### checkIconsetPath()

Checks a path against the drawing rules of the icon set (see the table above). An empty list means a path that
follows the rules.

| Parameter | Type | Description |
| --- | --- | --- |
| `d` | string | The `d` attribute. |

**Returns** `Array<{code: string, level: 'error'|'warning', segment?: number, error?: object}>` The breaches, in the
  order of the path.

### insetPath()

The outline of a closed shape moved inwards by a distance: drawn the other way round, it is the hole that leaves a
stroke of that width (an icon's ring, frame or outline). The shape is made of lines and arcs (the icon set's
commands); curves are refused.

- A line moves parallel to itself; an arc whose centre is inside keeps its centre, its radii shrink by the distance;
  an arc whose centre is outside grows by it.
- An arc whose smaller radius is not greater than the distance disappears: inside, the corner is sharp.
- At a corner that points outwards, the moved pieces are cut where they meet; at a corner that points inwards, they
  are joined by an arc of radius `distance` around the corner.
- A piece eaten by its neighbours (too short) is removed.
- The inner ellipse of an ellipse is the concentric one: its distance to the outline is only exact at the ends of
  the axes. The thinnest width is given as a warning when it is less than 98 % of the distance.

| Error | Meaning |
| --- | --- |
| `shapes` | the path is not one shape `M…z` |
| `command` | a curve (`C`, `S`, `Q`, `T`) |
| `small` | the shape is too small: nothing is left inside |
| `join` | two moved pieces do not meet |
| `narrow` | the shape is too narrow in places: the hole would cross itself |

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `segments` | Array<{command: string, values: number[]}> |  | One closed shape. |
| `distance` | number | `2` | The width of the stroke left. |

**Returns** `{segments: Array<{command: string, values: number[]}>, warnings: Array<{code: 'thin', segment: number, width: number}>} | {error: string}` The hole (absolute `M`, then relative commands, rounded to two decimals, the other way round), with the warnings;
  or the error.
