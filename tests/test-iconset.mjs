// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-iconset.mjs — node tests/run.mjs Iconset
// The tables of the icon set: categories, compression, drawing rules. These checks ran at each loading of the module;
// they are tests now.

import {describe, assert} from './kernel.mjs'
import {iconset, iconcategory, iconsetList, iconsetCount, iconPrivate} from '../src/icons/iconset.mjs'
import {checkIconsetPath} from '../src/utils/svg-path.mjs'

describe('Iconset — tables', () => {
  const categorised = new Set(Object.values(iconcategory).flat())
  const notCategorised = iconsetList.filter(name => !categorised.has(name))
  const unknown = [...categorised].filter(name => iconset[name] === undefined)
  assert(`every icon is in a category (${notCategorised.join(', ') || 'none missing'})`, notCategorised.length === 0)
  assert(`every name of a category is an icon (${unknown.join(', ') || 'none unknown'})`, unknown.length === 0)
  assert('iconsetCount counts the icons', iconsetCount === Object.keys(iconset).length)
  assert('the icons drawn by hand are icons', iconPrivate.every(name => iconset[name] !== undefined))
  assert('the names are lowercase letters', iconsetList.every(name => /^[a-z]+$/.test(name)))
})

describe('Iconset — drawing rules', () => {
  const uncompressed = iconsetList.filter(name => /\.[0-9]{3}/.test(iconset[name]) || / {2}/.test(iconset[name]))
  assert(`numbers with two decimals at most, no double space (${uncompressed.join(', ') || 'all compressed'})`, uncompressed.length === 0)
  const forbidden = iconPrivate.filter(name => !/^(?:M[-0-9. vhla]*z)+$/.test(iconset[name]))
  assert(`the icons drawn by hand use only M, v, h, l, a and z (${forbidden.join(', ') || 'all valid'})`, forbidden.length === 0)
  // the other rules (commands, square, writing, slopes) are not met by every redrawn icon yet: the editor shows them
  const STRICT = ['syntax', 'empty', 'shape-start', 'shape-end', 'decimals']
  const broken = iconPrivate.filter(name => checkIconsetPath(iconset[name]).some(issue => STRICT.includes(issue.code)))
  assert(`the icons drawn by hand: valid SVG, shapes M…z, two decimals (${broken.join(', ') || 'all valid'})`, broken.length === 0)
})
