# ValueNoise

Class `ValueNoise` · group `utils` · source [`src/utils/noise.mjs`](../../src/utils/noise.mjs)

Value noise, as the `noise()` function of p5.js: a table of 4 096 random values, interpolated, in several octaves.
Each octave doubles the frequency and multiplies the amplitude by the falloff.

## Methods

### constructor(random = defaultRandom, {octaves = 4, falloff = 0.5} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `random` | object | The generator (see the `random` module); default: the generator of the application. |
| `detail` | {octaves: number, falloff: number} | Number of octaves (4) and falloff of the amplitude from one octave to the next (0.5); see `detail()`. |

### detail(octaves, falloff)

Sets the details, as `noiseDetail()` of p5.js.

| Parameter | Type | Description |
| --- | --- | --- |
| `octaves` | number | Number of octaves, 1 or more. |
| `falloff` | number | Factor of the amplitude from one octave to the next, from 0 to 1 (above 0.5, the noise may exceed 1). |

### reseed()

Draws a new noise from the generator.

### get(x, y = 0, z = 0)

The noise at a point (negative coordinates are taken as positive, as in p5.js).

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | number |  | First coordinate. |
| `y` | number | `0` | Second coordinate. |
| `z` | number | `0` | Third coordinate. |

**Returns** `number` A number from 0 to about 1 (with the default details, at most 0.9375).
