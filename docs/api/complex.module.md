# complex

Module `complex` · group `utils` · source [`src/utils/complex.mjs`](../../src/utils/complex.mjs)

Complex numbers: `z = r + i·i`, or in polar form `z = mod · e^(i·arg)`.

A `Complex` holds its real part `r` and its imaginary part `i`; `mod` (modulus) and `arg` (argument, in radians,
from -π to π) are computed. Operations never change a number: they return a new one.

## Creating a number

`new Complex(r, i)` takes the two parts. `Complex.from(value)` reads any of these forms, and every operation
accepts them as its operand:

| Form | Example | Number |
| --- | --- | --- |
| a number | `3` | 3 + 0i |
| two numbers | `Complex.from(3, -2)`, `z.add(3, -2)` | 3 - 2i |
| a string | `'3-2i'`, `'-2.5i'`, `'i'`, `'1e3 + 4i'` | spaces are ignored |
| an array | `[3, -2]` | 3 - 2i |
| parts | `{r: 3, i: -2}` | 3 - 2i |
| a point or a vector | `{x: 3, y: -2}` | 3 - 2i |
| polar, in radians | `{mod: 2, arg: Math.PI / 2}` | 2i |
| polar, in degrees | `{mod: 2, deg: 90}` | 2i |

A form that cannot be read gives `NaN` parts, as `Number('x')` gives `NaN`; so does a division by zero.

## Operations

`add`, `sub`, `mul`, `div`, `negate`, `scale(k)`, `inverse`, `conjugate`, `exp`, `ln`, `pow(k)` (a real power),
`sqrt`, `equals(z, epsilon)`, `floor`, `ceil`, `round`, `roundTo(digits)`.

```javascript
import {Complex} from 'ricochet/ricochet-utils.mjs'

// a point of the Mandelbrot set: z → z² + c
let z = new Complex()
const c = Complex.from('-0.75+0.1i')
for (let n = 0; n < 100 && z.mod <= 2; n++) { z = z.mul(z).add(c) }
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `Complex` | class | A complex number. |
