// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-object-pool.mjs — node tests/run.mjs ObjectPool
// The pool of objects: creation at once, use and recycling, the walk (with recycling during the walk), the copies of
// an object template, the errors.

import {describe, assert} from './kernel.mjs'
import {ObjectPool} from '../src/utils/object-pool.mjs'

class Spark {
  constructor () {
    this.x = 0
    this.dead = false
  }

  create (x) {
    this.x = x
    this.dead = false
    return this
  }
}

describe('ObjectPool — use and recycle', () => {
  let made = 0
  const pool = new ObjectPool(3, () => { made += 1; return new Spark() })
  assert('created at once', made === 3 && pool.size === 3 && pool.length === 0)
  const a = pool.use().create(1)
  const b = pool.use().create(2)
  const c = pool.use().create(3)
  assert('in use', pool.length === 3 && pool.size === 3 && made === 3)
  const d = pool.use().create(4)
  assert('one more when none is free', pool.length === 4 && pool.size === 4 && made === 4 && d instanceof Spark)
  pool.recycle(b)
  assert('recycled', pool.length === 3 && pool.map(s => s.x).sort().join() === '1,3,4')
  const e = pool.use()
  assert('the recycled object is used again', e === b && e.x === 2 && made === 4)
  pool.recycle(a)
  pool.recycle(d)
  pool.recycle(e)
  pool.recycle(c)
  assert('all free', pool.length === 0 && pool.map().length === 0 && pool.size === 4)
})

describe('ObjectPool — walk', () => {
  const pool = new ObjectPool(10, () => new Spark())
  for (let x = 1; x <= 8; x++) { pool.use().create(x) }
  pool.forEach(s => { if (s.x % 2 === 0) { pool.recycle(s) } })
  assert('recycling during the walk', pool.length === 4 && pool.map(s => s.x).sort().join() === '1,3,5,7')
  assert('reduce', pool.reduce((sum, s) => sum + s.x, 0) === 16)
  const seen = []
  pool.forEach(s => seen.push(s.x))
  assert('each object once', seen.length === 4 && new Set(seen).size === 4)
  pool.clear()
  assert('clear', pool.length === 0 && pool.size === 10)
  for (let k = 0; k < 10; k++) { pool.use() }
  assert('all reused after clear', pool.size === 10 && pool.length === 10)
})

describe('ObjectPool — the array', () => {
  const pool = new ObjectPool(4, () => new Spark())
  const all = [pool.use().create(1), pool.use().create(2), pool.use().create(3)]
  pool.recycle(all[1])
  pool.recycle(all[1])
  assert('recycled twice: once', pool.length === 2 && pool.map(s => s.x).sort().join() === '1,3')
  pool.recycle({_slot: 0})
  assert('an object of another pool: ignored', pool.length === 2)
  pool.forEach(s => { pool.recycle(s) })
  assert('recycling all during the walk', pool.length === 0)
  for (let x = 1; x <= 4; x++) { pool.use().create(x) }
  const walked = []
  pool.forEach(s => {
    walked.push(s.x)
    if (s.x === 2) { pool.use().create(9) }
  })
  assert('taking during the walk: not walked', walked.length === 4 && pool.length === 5 && !walked.includes(9))
  const warnings = []
  const warn = console.warn
  console.warn = message => warnings.push(message)
  const named = new ObjectPool(2, () => ({}), {name: 'sparks'})
  for (let k = 0; k < 9; k++) { named.use() }
  console.warn = warn
  assert('a named pool warns when it grows past count, then at each doubling', warnings.length === 3 && warnings[0].includes('"sparks"') && warnings[0].includes('3 objects'))
  const silent = new ObjectPool(1, () => ({}))
  console.warn = message => warnings.push(message)
  silent.use()
  silent.use()
  console.warn = warn
  assert('without a name: silent', warnings.length === 3)
})

describe('ObjectPool — template object', () => {
  const pool = new ObjectPool(2, {x: 0, position: {x: 1, y: 2}, tags: ['a'], color: {clone () { return {cloned: true} }}})
  const a = pool.use()
  const b = pool.use()
  a.position.x = 99
  a.tags.push('b')
  assert('copies, one level down', b.position.x === 1 && b.tags.length === 1 && a !== b)
  assert('clone() when present', a.color.cloned === true)
})

describe('ObjectPool — errors', () => {
  const fails = (count, template) => {
    try {
      // eslint-disable-next-line no-new
      new ObjectPool(count, template)
      return false
    } catch {
      return true
    }
  }
  assert('count positive', fails(0, {}) && fails(1.5, {}) && fails('3', {}))
  assert('template: function or object', fails(2, 3) && fails(2, null) && !fails(2, () => ({})))
})
