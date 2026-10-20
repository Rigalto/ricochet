# noise

Module `noise` · group `utils` · source [`src/utils/noise.mjs`](../../src/utils/noise.mjs)

Noise: numbers that vary smoothly with their coordinates, for landscapes, clouds, textures or wandering moves.
Two kinds, each an instance with its own generator, so that two noises do not depend on each other:

| Class | Kind | Look |
| --- | --- | --- |
| `PerlinNoise` | gradient noise (Ken Perlin, 2002), with octaves | regular hills and valleys |
| `ValueNoise` | value noise, the `noise()` of p5.js and Processing | softer, a little blocky |

Both give a number from 0 to 1 for coordinates `(x, y, z)`; `y` and `z` are optional. Neighbouring coordinates give
neighbouring values: a step of 0.01 to 0.1 between two points gives a smooth curve. The same generator (see the
`random` module) seeded the same way gives the same noise.

**Octaves.** A noise is the sum of several layers: each layer, or octave, is finer than the previous one
(`scale`, the frequency) and weighs less (`amplitude`). More octaves give more details.

```javascript
import {Random, PerlinNoise} from 'ricochet/ricochet-utils.mjs'

const relief = new PerlinNoise(new Random('world-12'))
for (let x = 0; x < width; x++) { height[x] = 20 + 40 * relief.get(x * 0.02) }
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `PerlinNoise` | class | Gradient noise (Ken Perlin's improved noise), in one, two or three dimensions, with octaves. |
| `ValueNoise` | class | Value noise, as the `noise()` function of p5.js: a table of 4 096 random values, interpolated, in several octaves. Each octave doubles the frequency and multiplies the amplitude by the falloff. |
