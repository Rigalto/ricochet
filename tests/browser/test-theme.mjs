// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/browser/test-theme.mjs — open tests/browser/index.html in a browser
// Tokens, palettes, shades, day and night.

import {describe, assert} from '../kernel.mjs'
import {config} from '../../src/core/config.mjs'
import {MemoryAdapter} from '../../src/adapters/memory.mjs'
import {setTheme, theme, THEME_ITEM} from '../../src/ui/theme.mjs'
import {bus} from '../../src/core/bus.mjs'
import {css} from '../../src/core/css.mjs'

const sandbox = document.getElementById('sandbox')
const tick = () => new Promise(resolve => setTimeout(resolve, 0))
const background = element => getComputedStyle(element).backgroundColor
const color = element => getComputedStyle(element).color

await describe('Theme — palettes and shades', async () => {
  sandbox.innerHTML = `
    <div id="page"></div>
    <div palette="view" id="view"><span id="inner"></span>
      <div shade="deep" id="deep"></div>
      <div palette="module" id="module"></div>
    </div>`
  const $ = id => document.getElementById(id)
  assert('a palette gives its own surface', background($('view')) !== background(document.documentElement))
  assert('every element inside gets the tokens of the block', color($('inner')) === color($('view')))
  assert('a shade darkens the surface, with the hue of the palette around it',
    background($('deep')) !== background($('view')) && background($('deep')).endsWith(' 225)'))
  assert('a palette inside another one wins for its subtree', background($('module')).endsWith(' 75)'))
  css('[palette="test-game"] { --rc-hue: 140; --rc-chroma: .07; }')
  $('page').setAttribute('palette', 'test-game')
  assert('an application palette sets the parameters only', background($('page')).endsWith(' 140)'))
})

await describe('Theme — states mixed with the surface', async () => {
  sandbox.innerHTML = '<div palette="view"><span id="a" style="background: var(--rc-danger-surface)"></span></div><div palette="module"><span id="b" style="background: var(--rc-danger-surface)"></span></div>'
  assert('the same state differs from one palette to another', background(document.getElementById('a')) !== background(document.getElementById('b')))
})

await describe('Theme — day and night', async () => {
  const events = []
  const onTheme = payload => events.push(payload)
  bus.on('themeChanged', onTheme)
  config.setAdapter(new MemoryAdapter({[THEME_ITEM]: 'system'}))
  await config.load()
  await tick()
  sandbox.innerHTML = '<div palette="view" id="v"></div><div scheme="night" id="n"><div palette="view" id="vn"></div></div>'
  const v = document.getElementById('v')
  setTheme('day')
  await tick()
  const day = background(v)
  assert('day: color-scheme light', document.documentElement.style.colorScheme === 'light' && theme.scheme === 'day')
  setTheme('night')
  await tick()
  assert('night: the surfaces change', background(v) !== day && document.documentElement.style.colorScheme === 'dark')
  assert('themeChanged tells the theme and the scheme', events.at(-1)?.theme === 'night' && events.at(-1)?.scheme === 'night')
  assert('saved in the configuration item', config.get(THEME_ITEM) === 'night')
  setTheme('day')
  await tick()
  assert('scheme="night" forces the night on a block', background(document.getElementById('vn')) !== day && background(document.getElementById('vn')) !== '')
  setTheme('system')
  await tick()
  assert('system: color-scheme follows the computer', document.documentElement.style.colorScheme === 'light dark')
  bus.off('themeChanged', onTheme)
  sandbox.innerHTML = ''
})
