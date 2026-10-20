# math

Module `math` · group `utils` · source [`src/utils/math.mjs`](../../src/utils/math.mjs)

Small functions on numbers: bounds, interpolation, angles, rounding. Their names and their parameters follow
`MathUtils` of Three.js and lodash, so that they are familiar.

| Function | Result |
| --- | --- |
| `clamp(value, min, max)` | `value` brought between `min` and `max` |
| `isBetween(value, min, max)` | `true` if `min ≤ value ≤ max` (both bounds included, unlike `inRange` of lodash) |
| `approxEqual(a, b, epsilon)` | `true` if `a` and `b` differ by less than a relative `epsilon` |
| `lerp(x, y, t)` | linear interpolation: `x` for `t = 0`, `y` for `t = 1` |
| `inverseLerp(x, y, value)` | the `t` that gives `value` |
| `mapLinear(value, a1, a2, b1, b2)` | `value` of the range `a1…a2` carried over to the range `b1…b2` |
| `damp(x, y, lambda, dt)` | moves `x` towards `y` at a rate independent of the frame rate |
| `smoothstep(x, min, max)`, `smootherstep(x, min, max)` | 0 to 1 between `min` and `max`, with a soft start and end |
| `cosineInterpolate(x, y, t)` | interpolation on a half cosine |
| `sigmoid(value)` | logistic function, from 0 to 1 |
| `degToRad(degrees)`, `radToDeg(radians)` | angle conversions |
| `euclideanModulo(n, m)` | remainder of `n / m`, always of the sign of `m` (`-1 mod 5` is 4) |
| `roundTo(value, digits)` | rounded to `digits` decimals |
| `splitNumber(value)` | `{int, fract}`: the integer part (towards minus infinity) and the rest |
| `isPowerOfTwo(n)` | `true` for 1, 2, 4, 8… |
| `isNumber(value)`, `toNumber(value, fallback)` | a finite number (or a string holding one), and its value |

```javascript
import {clamp, lerp, damp} from 'ricochet/ricochet-utils.mjs'

volume = clamp(volume + step, 0, 100)
camera.x = damp(camera.x, target.x, 8, dt / 1000) // the same smoothness at 30 and at 144 frames per second
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `clamp` | function | Brings a value between two bounds. |
| `isBetween` | function | Tells whether a value lies between two bounds, both included. |
| `approxEqual` | function | Compares two numbers with a tolerance relative to their size (absolute below 1). |
| `lerp` | function | Linear interpolation. |
| `inverseLerp` | function | The position of a value between two others: the inverse of `lerp()`. |
| `mapLinear` | function | Carries a value from one range over to another. |
| `damp` | function | Moves a value towards a target, at a rate that does not depend on the frame rate (exponential decay). |
| `smoothstep` | function | Smooth step from 0 to 1: `3t² - 2t³`, where `t` is the position of `x` between `min` and `max`. |
| `smootherstep` | function | Smoother step from 0 to 1: `6t⁵ - 15t⁴ + 10t³`, flat at both ends (Ken Perlin). |
| `cosineInterpolate` | function | Interpolation on a half cosine: softer than `lerp()` near both ends. |
| `sigmoid` | function | Logistic function. |
| `degToRad` | function | Converts degrees to radians. |
| `radToDeg` | function | Converts radians to degrees. |
| `euclideanModulo` | function | Remainder of a division, of the sign of the divisor: useful to wrap an index or an angle. |
| `roundTo` | function | Rounds to a number of decimals. |
| `splitNumber` | function | Splits a number into its integer part, towards minus infinity, and the rest. |
| `isPowerOfTwo` | function | Tells whether an integer is a power of two. |
| `isNumber` | function | Tells whether a value is a finite number, or a string holding one (`'3.5'`, `' -2 '`). |
| `toNumber` | function | Reads a number. |

## Details

### clamp()

Brings a value between two bounds.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | number | The value. |
| `min` | number | Lower bound. |
| `max` | number | Upper bound. |

**Returns** `number` `min` if the value is lower, `max` if it is greater, the value otherwise.

### isBetween()

Tells whether a value lies between two bounds, both included.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | number | The value. |
| `min` | number | Lower bound. |
| `max` | number | Upper bound. |

**Returns** `boolean` `true` if `min ≤ value ≤ max`.

### approxEqual()

Compares two numbers with a tolerance relative to their size (absolute below 1).

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `a` | number |  | First number. |
| `b` | number |  | Second number. |
| `epsilon` | number | `1e-6` | Tolerance. |

**Returns** `boolean` `true` if `abs(a - b) ≤ epsilon × max(1, abs(a), abs(b))`.

### lerp()

Linear interpolation.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | Value for `t = 0`. |
| `y` | number | Value for `t = 1`. |
| `t` | number | Position, usually between 0 and 1. |

**Returns** `number` `x + (y - x) × t`.

### inverseLerp()

The position of a value between two others: the inverse of `lerp()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | Value for 0. |
| `y` | number | Value for 1. |
| `value` | number | The value. |

**Returns** `number` `(value - x) / (y - x)`, or 0 when `x` and `y` are equal.

### mapLinear()

Carries a value from one range over to another.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | number | The value, in the range `a1…a2`. |
| `a1` | number | Start of the first range. |
| `a2` | number | End of the first range. |
| `b1` | number | Start of the second range. |
| `b2` | number | End of the second range. |

**Returns** `number` The value in the range `b1…b2` (not clamped).

### damp()

Moves a value towards a target, at a rate that does not depend on the frame rate (exponential decay).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | Current value. |
| `y` | number | Target. |
| `lambda` | number | Speed: the higher, the faster (about 1 to 25). |
| `dt` | number | Time since the last call, in seconds. |

**Returns** `number` The new value.

### smoothstep()

Smooth step from 0 to 1: `3t² - 2t³`, where `t` is the position of `x` between `min` and `max`.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The value. |
| `min` | number | Value giving 0. |
| `max` | number | Value giving 1. |

**Returns** `number` A number from 0 to 1.

### smootherstep()

Smoother step from 0 to 1: `6t⁵ - 15t⁴ + 10t³`, flat at both ends (Ken Perlin).

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | The value. |
| `min` | number | Value giving 0. |
| `max` | number | Value giving 1. |

**Returns** `number` A number from 0 to 1.

### cosineInterpolate()

Interpolation on a half cosine: softer than `lerp()` near both ends.

| Parameter | Type | Description |
| --- | --- | --- |
| `x` | number | Value for `t = 0`. |
| `y` | number | Value for `t = 1`. |
| `t` | number | Position, between 0 and 1. |

**Returns** `number` The interpolated value.

### sigmoid()

Logistic function.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | number | Any number. |

**Returns** `number` `1 / (1 + e^-value)`, from 0 to 1, 0.5 for 0.

### degToRad()

Converts degrees to radians.

| Parameter | Type | Description |
| --- | --- | --- |
| `degrees` | number | Angle in degrees. |

**Returns** `number` Angle in radians.

### radToDeg()

Converts radians to degrees.

| Parameter | Type | Description |
| --- | --- | --- |
| `radians` | number | Angle in radians. |

**Returns** `number` Angle in degrees.

### euclideanModulo()

Remainder of a division, of the sign of the divisor: useful to wrap an index or an angle.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | number | Dividend. |
| `m` | number | Divisor. |

**Returns** `number` A number from 0 (included) to `m` (excluded).

### roundTo()

Rounds to a number of decimals.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | number |  | The value. |
| `digits` | number | `0` | Number of decimals. |

**Returns** `number` The rounded value.

### splitNumber()

Splits a number into its integer part, towards minus infinity, and the rest.

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | number | The value. |

**Returns** `{int: number, fract: number}` `int + fract === value`, with `0 ≤ fract < 1`.

### isPowerOfTwo()

Tells whether an integer is a power of two.

| Parameter | Type | Description |
| --- | --- | --- |
| `n` | number | A positive integer. |

**Returns** `boolean` `true` for 1, 2, 4, 8…

### isNumber()

Tells whether a value is a finite number, or a string holding one (`'3.5'`, `' -2 '`).

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | * | The value. |

**Returns** `boolean` `true` if `toNumber()` would give its value.

### toNumber()

Reads a number.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | * |  | A number, or a string holding one. |
| `fallback` | number | `0` | Result when the value is not a finite number. |

**Returns** `number` The number.
