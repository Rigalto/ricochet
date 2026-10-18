// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-router.mjs — node tests/run.mjs Router
// The router with a fake address (globalThis.location), and the universe/brick resolver.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {Router, router as kernelRouter} from '../src/core/router.mjs'
import {universeBrickResolver} from '../src/routing/universe-brick.mjs'
import {setItemStore} from '../src/core/items.mjs'
import {WController} from '../src/core/w-controller.mjs'
import {bus} from '../src/core/bus.mjs'

// a fake address: replace() records the replacements
const fakeLocation = hash => {
  const location = {hash, replaced: []}
  location.replace = target => { location.replaced.push(target); location.hash = target }
  globalThis.location = location
  return location
}

// a store of configuration items that records the scope
const scopes = []
setItemStore({setScope: scope => scopes.push(scope), addObserver: () => 0, removeObserver () {}, setItem () {}, setItemIfValue () {}})

const record = names => {
  const got = []
  const fns = names.map(name => { const fn = payload => got.push([name, payload]); bus.on(name, fn); return [name, fn] })
  got.stop = () => { for (const [name, fn] of fns) { bus.off(name, fn) } }
  got.names = () => got.map(g => g[0]).join()
  return got
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

await describe('Router — a route', async () => {
  fakeLocation('#hom/not/table/')
  const router = new Router()
  const got = record(['routeChanged'])
  router.setResolver(({path, terms}) => ({path, terms, scope: `${terms[0]}-${terms[1]}`, extra: 1}))
  const route = await router.resolve()
  assert('the path, without # nor trailing /, and its terms', route.path === 'hom/not/table' && route.terms.join() === 'hom,not,table')
  assert('routeChanged with the route', got.length === 1 && got[0][1] === route && route.extra === 1)
  assert('the scope is set before routeChanged', scopes.at(-1) === 'hom-not')
  assert('current', router.current === route)
  got.stop()
})

await describe('Router — redirects', async () => {
  const location = fakeLocation('')
  const router = new Router()
  router.setResolver(({path, terms}) => path === '' ? {redirect: 'hom'} : terms.length === 1 ? {redirect: '#hom/not'} : {path, terms})
  const route = await router.resolve()
  assert('followed until a route', route.path === 'hom/not')
  assert('with location.replace(): no entry in the history', location.replaced.join() === '#hom,#hom/not')
  fakeLocation('#loop')
  const looping = new Router()
  looping.setResolver(({path}) => ({redirect: path === 'loop' ? 'pool' : 'loop'}))
  const got = record(['routeError'])
  captureConsole()
  let error = null
  try { await looping.resolve({throws: true}) } catch (e) { error = e }
  releaseConsole()
  assert('more than 10 redirects: an error', error?.message.includes('more than 10 redirects') && got.length === 1)
  got.stop()
})

await describe('Router — module of the route', async () => {
  fakeLocation('#gam/sdk')
  const router = new Router()
  const order = []
  const got = record(['routeLoading', 'routeChanged'])
  router.setResolver(({path, terms}) => ({path, terms, load: async () => { order.push('load') }}))
  bus.on('routeChanged', () => order.push('changed'))
  await router.resolve()
  assert('routeLoading, then the module, then routeChanged', got.names() === 'routeLoading,routeChanged' && order.join() === 'load,changed')
  got.stop()
  const failing = new Router()
  const errors = record(['routeError', 'routeChanged'])
  let first = true
  failing.setResolver(({path, terms}) => ({path, terms, load: first ? null : () => Promise.reject(new Error('404'))}))
  await failing.resolve()
  first = false
  const previous = failing.current
  fakeLocation('#gam/ast')
  captureConsole()
  const result = await failing.resolve()
  const lines = releaseConsole()
  assert('a module that fails: routeError, the former route stays', result === null && failing.current === previous &&
    errors.names() === 'routeChanged,routeError' && errors[1][1].error.message === '404' && lines.length === 1)
  errors.stop()
})

await describe('Router — only the latest navigation is applied', async () => {
  fakeLocation('#slow')
  const router = new Router()
  const got = record(['routeChanged'])
  router.setResolver(async ({path, terms}) => {
    if (path === 'slow') { await new Promise(resolve => setTimeout(resolve, 30)) }
    return {path, terms}
  })
  const slow = router.resolve()
  fakeLocation('#fast')
  const fast = router.resolve()
  const results = await Promise.all([slow, fast])
  assert('the former navigation is dropped', results[0] === null && results[1].path === 'fast')
  assert('one routeChanged', got.length === 1 && router.current.path === 'fast')
  got.stop()
})

await describe('Router — failures of the resolver', async () => {
  fakeLocation('#x')
  const router = new Router()
  router.setResolver(() => null)
  captureConsole()
  let error = null
  try { await router.resolve({throws: true}) } catch (e) { error = e }
  router.setResolver(() => { throw new Error('boom') })
  const result = await router.resolve()
  releaseConsole()
  assert('no route: an error', error?.message === "no route for 'x'")
  assert('a resolver that throws: null without throws', result === null)
})

await describe('Router — a listener receives the current route', async () => {
  fakeLocation('#hom/not/table')
  kernelRouter.setResolver(({path, terms}) => ({path, terms}))
  await kernelRouter.resolve()
  class C extends WController {
    constructor () { super(); this.got = []; this.listen('routeChanged'); this.ready = true }
    routeChangedDispatched (route) { this.got.push([route.path, this.ready]) }
  }
  const c = new C()
  assert('not during listen()', c.got.length === 0)
  await tick()
  assert('at the end of the task, once the constructor has finished', c.got.length === 1 && c.got[0][0] === 'hom/not/table' && c.got[0][1])
  fakeLocation('#hom/lnk/table')
  await kernelRouter.resolve()
  assert('then at each change', c.got.length === 2 && c.got[1][0] === 'hom/lnk/table')
  const d = new C()
  d.unlisten('routeChanged')
  await tick()
  assert('not if unsubscribed meanwhile', d.got.length === 0)
  c.release()
})

const resolver = universeBrickResolver({
  universes: {hom: {bricks: ['not', 'lnk']}, gam: {bricks: ['sdk', 'not']}},
  bricks: {not: {mode: 'table', load: () => 'notes'}, lnk: {mode: 'table'}, sdk: {label: 'Sudoku'}},
  rules: [
    async ({terms}) => terms[0] === 'card' ? {redirect: `hom/not/table/${terms[1]}/card`} : undefined,
  ],
})
const resolveTerms = path => resolver({path, terms: path.split('/')})

await describe('Router — universe/brick resolver', async () => {
  assert('empty path: first universe, first brick, its mode', (await resolveTerms('')).redirect === 'hom/not/table')
  assert('unknown universe', (await resolveTerms('xyz/not')).redirect === 'hom/not/table')
  assert('missing brick', (await resolveTerms('gam')).redirect === 'gam/sdk')
  assert('brick not in the universe', (await resolveTerms('gam/lnk')).redirect === 'gam/sdk')
  assert('missing mode', (await resolveTerms('gam/not')).redirect === 'gam/not/table')
  const route = await resolveTerms('gam/not/table/12/card')
  assert('a route', route.universe === 'gam' && route.brick === 'not' && route.rest.join() === 'table,12,card' &&
    route.scope === 'gam-not' && route.load() === 'notes' && route.definition.mode === 'table')
  assert('a brick without mode', (await resolveTerms('gam/sdk')).definition.label === 'Sudoku')
  assert('a rule runs first', (await resolveTerms('card/42')).redirect === 'hom/not/table/42/card')
  const router = new Router()
  const location = fakeLocation('#card/42')
  router.setResolver(resolver)
  const final = await router.resolve()
  assert('with the router', final.path === 'hom/not/table/42/card' && location.replaced.length === 1)
})
