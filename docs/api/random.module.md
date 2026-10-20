# random

Module `random` · group `utils` · source [`src/utils/random.mjs`](../../src/utils/random.mjs)

Pseudo-random numbers that can be replayed: the same seed gives the same sequence, on every browser. A game draws
the same world from the same seed; a test gets the same values at every run.

The generator is **sfc32** (Chris Doty-Humphrey's Small Fast Counting generator): 128 bits of state, a period of
at least 2³², fast, and good statistical quality. It is not secure: for a password or a key, use
`crypto.getRandomValues()`.

- **Instances.** `random` is the generator of the application, with a seed drawn by the browser at startup;
  `random.seed(value)` makes it replayable. A part of the application that must not depend on the other draws (a
  world generator) creates its own: `new Random('world-12')`.
- **Seeds.** A seed is an integer or a string (a string is hashed with `djb2`).
- **Ranges.** `int()` and `float()` accept the bounds, or an object `{min, max}`.
- **State.** `getState()` and `setState()` save and restore the position in the sequence (in a saved game).

| Method | Result |
| --- | --- |
| `next()` | a number from 0 (included) to 1 (excluded) |
| `int(min, max)`, `int(max)` | an integer from `min` (0) to `max`, both included |
| `float(min, max)`, `float(max)` | a number from `min` (0) to `max` (excluded) |
| `bool(probability)` | `true` with the probability (0.5) |
| `pick(array)`, `index(array)` | an element, its index (`undefined` if the array is empty) |
| `weightedPick(items, weight)`, `weightedIndex(items, weight)` | an element, its index, each with the chance of its weight |
| `shuffle(array)` | the array itself, shuffled in place (Fisher–Yates) |
| `gaussian(mean, deviation)` | a number of normal distribution (Box–Muller) |
| `linear()` | a number from 0 to 1 whose density grows with the value: 0.9 comes nine times as often as 0.1 |

```javascript
import {random, Random} from 'ricochet/ricochet-utils.mjs'

const damage = random.int(3, 8)
const loot = random.weightedPick([{name: 'gold', weight: 10}, {name: 'gem', weight: 1}])

const world = new Random(seedOfTheWorld)
const height = world.float(20, 40)
```

The function `entropy(items, weight)` gives the entropy, in bits, of a set of weighted choices: 1 for two equal
choices, 0 for a choice made in advance.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `Random` | class | A generator of pseudo-random numbers. |
| `random` | const | The generator of the application, seeded by the browser at startup. |
| `entropy` | function | Entropy of a set of weighted choices, in bits. |

## Details

### entropy()

Entropy of a set of weighted choices, in bits.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | Array | The choices. |
| `weight` | Function | Gives the weight of a choice; default: its `weight` property, or 1. A weight of 0 or less does not count. |

**Returns** `number` 0 for a single possible choice, 1 for two equal choices, log2(n) for n equal choices.
