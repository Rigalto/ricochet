# PerlinNoise

Class `PerlinNoise` · group `utils` · source [`src/utils/noise.mjs`](../../src/utils/noise.mjs)

Gradient noise (Ken Perlin's improved noise), in one, two or three dimensions, with octaves.

## Methods

### constructor(random = defaultRandom, octaves = DEFAULT_OCTAVES)

| Parameter | Type | Description |
| --- | --- | --- |
| `random` | object | The generator (see the `random` module); default: the generator of the application. |
| `octaves` | Array<{scale: number, amplitude: number}> | The octaves; default: four octaves, scales 1, 2, 4, 8 and amplitudes 1, 0.5, 0.25, 0.125. |

### setOctaves(octaves)

Changes the octaves.

| Parameter | Type | Description |
| --- | --- | --- |
| `octaves` | Array<{scale: number, amplitude: number}> | Scale (frequency) and amplitude of each octave. |

### reseed()

Draws a new noise from the generator.

### get(x, y = 0, z = 0)

The noise at a point.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `x` | number |  | First coordinate. |
| `y` | number | `0` | Second coordinate. |
| `z` | number | `0` | Third coordinate. |

**Returns** `number` A number from 0 to 1; 0.5 on average.
