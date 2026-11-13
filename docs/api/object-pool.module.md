# object-pool

Module `object-pool` · group `utils` · source [`src/utils/object-pool.mjs`](../../src/utils/object-pool.mjs)

A pool of objects: many short-lived objects (particles, bullets, sparks) are taken from the pool and given back to
it, instead of being created and left to the garbage collector. No object is destroyed, so the collector does not
run in the middle of an animation, and creating an object costs nothing once the pool is warm.

```javascript
import {ObjectPool} from 'ricochet/ricochet-utils.mjs'

const sparks = new ObjectPool(200, () => new Spark())   // 200 sparks created at once
const spark = sparks.use()                               // a free spark, now in use
spark.create(x, y)                                       // set ALL its attributes: it may have been used before
sparks.forEach(s => {
  s.move()
  if (s.dead) { sparks.recycle(s) }                      // allowed while walking the pool
})
```

## The two lists

The pool keeps the free objects in a singly linked list, and the objects in use in a doubly linked list: `use()`,
`recycle()` and the walk are constant time per object, without arrays to shift. The pool adds two attributes to
each object, `_next` and `_previous`: the application must neither change nor delete them.

## The objects

The second argument of the constructor gives the objects:

- **a function** that returns a new object, usually an instance of a class (`() => new Spark()`): the constructor
  creates every attribute, so that none is added later;
- **an object**, copied for each new object: its attributes are copied, and an attribute that is itself an object
  is copied one level down (with its `clone()` method when it has one).

An object taken by `use()` keeps the values of its previous use: the application sets them all, usually with a
`create(…)` method. `new Spark(x, y)` becomes `pool.use().create(x, y)`.

## The size

The pool creates `count` objects at once; when they are all in use, `use()` creates one more. The pool never
shrinks. `length` (in use) and `size` (created) help to choose `count`, and to find objects never given back: an
object that is not recycled is never collected either.

## Finding an object

The pool is walked, not searched. To find an object by its key, keep a `Map` beside the pool: add the object after
`use()`, delete it before `recycle()`.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `ObjectPool` | class | A pool of reusable objects. |
