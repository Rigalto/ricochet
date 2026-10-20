# Random

Class `Random` · group `utils` · source [`src/utils/random.mjs`](../../src/utils/random.mjs)

A generator of pseudo-random numbers.

## Methods

### constructor(seed)

| Parameter | Type | Description |
| --- | --- | --- |
| `seed` | number\|string | The seed; default: drawn by the browser (`Math.random()`). |

### seed(seed)

Starts the sequence again from a seed.

| Parameter | Type | Description |
| --- | --- | --- |
| `seed` | number\|string | An integer or a string; default: drawn by the browser. |

### next()

The next number of the sequence.

**Returns** `number` A number from 0 (included) to 1 (excluded).

### int(a, b)

An integer between two bounds, both included.

| Parameter | Type | Description |
| --- | --- | --- |
| `a` | number\|{min: number, max: number} | The upper bound (the lower one is then 0), the lower bound, or both bounds. |
| `b` | number | The upper bound. |

**Returns** `number` An integer from `min` to `max`.

### float(a = 1, b)

A number between two bounds, the upper one excluded.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `a` | number\|{min: number, max: number} | `1` | The upper bound (the lower one is then 0), the lower bound, or both bounds. |
| `b` | number |  | The upper bound. |

**Returns** `number` A number from `min` to `max`.

### bool(probability = 0.5)

`true` with a given probability.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `probability` | number | `0.5` | From 0 (never) to 1 (always). |

**Returns** `boolean` The draw.

### index(array)

An index of an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | Array | The array. |

**Returns** `number|undefined` An index, or `undefined` if the array is empty.

### pick(array)

An element of an array.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | Array | The array. |

**Returns** `*` An element, or `undefined` if the array is empty.

### weightedIndex(items, weight = defaultWeight)

An index of an array, each element with the chance of its weight.

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | Array | The elements. |
| `weight` | Function | Gives the weight of an element; default: its `weight` property, or 1. A weight of 0 or less is never drawn. |

**Returns** `number|undefined` An index, or `undefined` if no element has a positive weight.

### weightedPick(items, weight = defaultWeight)

An element of an array, each with the chance of its weight (see `weightedIndex()`).

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | Array | The elements. |
| `weight` | Function | Gives the weight of an element; default: its `weight` property, or 1. |

**Returns** `*` An element, or `undefined` if no element has a positive weight.

### shuffle(array)

Shuffles an array in place (Fisher–Yates).

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | Array | The array, changed. |

**Returns** `Array` The same array.

### gaussian(mean = 0, deviation = 1)

A number of normal distribution (Box–Muller).

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `mean` | number | `0` | Mean. |
| `deviation` | number | `1` | Standard deviation. |

**Returns** `number` The draw: 68 % of the draws are within one deviation of the mean.

### linear()

A number from 0 to 1 whose density grows linearly with the value.

**Returns** `number` The square root of a uniform draw.

### getState()

The position in the sequence, to save it.

**Returns** `number[]` Four integers.

### setState([a, b, c, d])

Goes back to a position saved by `getState()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `state` | number[] | Four integers. |
