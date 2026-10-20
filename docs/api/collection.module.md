# collection

Module `collection` · group `utils` · source [`src/utils/collection.mjs`](../../src/utils/collection.mjs)

Functions on objects, arrays and sets, for the cases the language does not cover.

| Function | Result |
| --- | --- |
| `clearObject(object)` | the object emptied in place: those who hold it see it empty |
| `removeWhere(array, predicate)` | the matching elements removed in place, fast, without keeping the order |
| `removeUnordered(array, element)` | one element removed in place, fast, without keeping the order |
| `firstOf(iterable)` | the first element of a set, a map or any iterable |

**Removing without keeping the order.** The element removed is replaced by the last one of the array: nothing is
moved, nothing is allocated. On a large array, it is several times as fast as `filter()` or `splice()`; use it
for lists whose order does not matter (the particles of a game, the entities of a world).

The language already gives the rest:

| Need | Native |
| --- | --- |
| a deep copy | `structuredClone(value)` (functions and DOM nodes are not copied) |
| a shallow copy | `{...object}`, `[...array]` |
| an array sorted, reversed or changed, without changing the original | `toSorted()`, `toReversed()`, `with()` |
| groups | `Object.groupBy(items, fn)`, `Map.groupBy(items, fn)` |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `clearObject` | function | Deletes every own property of an object, in place. |
| `removeWhere` | function | Removes in place the elements of an array that match a predicate; the order of the others is not kept. |
| `removeUnordered` | function | Removes in place one element of an array, by putting the last element in its place. |
| `firstOf` | function | The first element of an iterable. |

## Details

### clearObject()

Deletes every own property of an object, in place.

| Parameter | Type | Description |
| --- | --- | --- |
| `object` | object | The object, emptied. |

**Returns** `object` The same object.

### removeWhere()

Removes in place the elements of an array that match a predicate; the order of the others is not kept.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | Array | The array, changed. |
| `predicate` | Function | `(element) => boolean`: `true` to remove the element. |

**Returns** `number` The number of elements removed.

### removeUnordered()

Removes in place one element of an array, by putting the last element in its place.

| Parameter | Type | Description |
| --- | --- | --- |
| `array` | Array | The array, changed. |
| `element` | * | The element (its first occurrence). |

**Returns** `boolean` `true` if the element was found and removed.

### firstOf()

The first element of an iterable.

| Parameter | Type | Description |
| --- | --- | --- |
| `iterable` | Iterable | A set, a map (its first entry), an array… |

**Returns** `*` The first element, or `undefined` if it is empty.
