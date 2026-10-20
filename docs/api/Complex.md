# Complex

Class `Complex` · group `utils` · source [`src/utils/complex.mjs`](../../src/utils/complex.mjs)

A complex number.

## Methods

### constructor(r = 0, i = 0)

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `r` | number | `0` | Real part. |
| `i` | number | `0` | Imaginary part. |

### static from(value, imaginary)

Reads a complex number from any of its forms (see the module).

| Parameter | Type | Description |
| --- | --- | --- |
| `value` | * | A `Complex`, a number, a string, an array, `{r, i}`, `{x, y}`, `{mod, arg}` or `{mod, deg}`. |
| `imaginary` | number | With a number as first parameter: the imaginary part. |

**Returns** `Complex` The number; a `Complex` given is returned as it is.

### static polar(mod, arg)

A complex number from its polar form.

| Parameter | Type | Description |
| --- | --- | --- |
| `mod` | number | Modulus. |
| `arg` | number | Argument, in radians. |

**Returns** `Complex` `mod · (cos arg + i·sin arg)`.

### get mod

Modulus: the distance to 0.

### get arg

Argument: the angle with the real axis, in radians, from -π to π.

### add(z, imaginary)

Sum.

| Parameter | Type | Description |
| --- | --- | --- |
| `z` | * | The other number, in any form. |
| `imaginary` | number | Its imaginary part, when `z` is a number. |

**Returns** `Complex` `this + z`.

### sub(z, imaginary)

Difference.

| Parameter | Type | Description |
| --- | --- | --- |
| `z` | * | The other number, in any form. |
| `imaginary` | number | Its imaginary part, when `z` is a number. |

**Returns** `Complex` `this - z`.

### mul(z, imaginary)

Product.

| Parameter | Type | Description |
| --- | --- | --- |
| `z` | * | The other number, in any form. |
| `imaginary` | number | Its imaginary part, when `z` is a number. |

**Returns** `Complex` `this × z`.

### div(z, imaginary)

Quotient.

| Parameter | Type | Description |
| --- | --- | --- |
| `z` | * | The other number, in any form. |
| `imaginary` | number | Its imaginary part, when `z` is a number. |

**Returns** `Complex` `this / z`; `NaN` parts if `z` is 0.

### negate()

Opposite.

**Returns** `Complex` `-this`.

### scale(k)

Product by a real number.

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | number | The factor. |

**Returns** `Complex` `k × this`.

### inverse()

Inverse.

**Returns** `Complex` `1 / this`; `NaN` parts for 0.

### conjugate()

Conjugate.

**Returns** `Complex` `r - i·i`.

### exp()

Exponential.

**Returns** `Complex` `e^this = e^r · (cos i + i·sin i)`.

### ln()

Natural logarithm (principal value).

**Returns** `Complex` `ln(mod) + i·arg`.

### pow(k)

Real power (principal value).

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | number | The exponent. |

**Returns** `Complex` `mod^k · e^(i·k·arg)`.

### sqrt()

Square root (principal value: real part positive or zero).

**Returns** `Complex` The number whose square is `this`.

### equals(z, epsilon = 1e-6)

Compares with a tolerance (see `approxEqual()` in the `math` module).

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `z` | * |  | The other number, in any form. |
| `epsilon` | number | `1e-6` | Tolerance, on each part. |

**Returns** `boolean` `true` if both parts are nearly equal.

### floor()

Both parts rounded down.

**Returns** `Complex` The rounded number.

### ceil()

Both parts rounded up.

**Returns** `Complex` The rounded number.

### round()

Both parts rounded to the nearest integer.

**Returns** `Complex` The rounded number.

### roundTo(digits = 2)

Both parts rounded to a number of decimals.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `digits` | number | `2` | Number of decimals. |

**Returns** `Complex` The rounded number.

### toString(digits = 6)

The number as a string, readable by `Complex.from()`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `digits` | number | `6` | Decimals at most; trailing zeros are removed. |

**Returns** `string` For instance `'3-2.5i'`, `'4'`, `'-i'`; `'NaN'` if a part is not a number.

### toArray()

The parts in an array.

**Returns** `number[]` `[r, i]`.

### toJSON()

The parts in an object, used by `JSON.stringify()`.

**Returns** `{r: number, i: number}` The parts.

### toDataView(view, offset)

Writes the parts as two 32-bit floats (little-endian), for a buffer sent to the graphics card.

| Parameter | Type | Description |
| --- | --- | --- |
| `view` | DataView | The buffer. |
| `offset` | number | Position in bytes. |

**Returns** `number` The number of bytes written: 8.
