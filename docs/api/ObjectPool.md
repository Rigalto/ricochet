# ObjectPool

Class `ObjectPool` · group `utils` · source [`src/utils/object-pool.mjs`](../../src/utils/object-pool.mjs)

A pool of reusable objects.

## Methods

### constructor(count, template, {name = ''} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `count` | number | The number of objects created at once (at least 1). |
| `template` | Function\|object | A function that returns a new object, or an object to copy. |
| `options` | object |  |
| `options.name` | string | The name of the pool: it then warns in the console when it grows past `count`. |

### get length

The number of objects in use.

### get size

The number of objects created (in use and free).

### use()

Takes a free object (created if none is free) and puts it in use. Its attributes keep their previous values: set
them all.

**Returns** `object` The object.

### recycle(obj)

Gives an object back: it is free again, for a next `use()`. Allowed for the current object of a walk.

| Parameter | Type | Description |
| --- | --- | --- |
| `obj` | object | An object in use, taken from this pool. |

### clear()

Gives all the objects back.

### forEach(callback)

Calls `callback` for each object in use, from the last to the first; the callback may recycle the current object.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | (obj: object) => void | For each object. |

### reduce(callback, initial)

Reduces the objects in use to one value, as `Array.prototype.reduce`.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | (accumulator: *, obj: object) => * | Gives the new value of the accumulator. |
| `initial` | * | The first value of the accumulator. |

**Returns** `*` The last value of the accumulator.

### map(callback)

The objects in use in an array, or what `callback` returns for each.

| Parameter | Type | Description |
| --- | --- | --- |
| `callback` | (obj: object) => * | For each object. |

**Returns** `Array` The array.
