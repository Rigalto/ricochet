// tests/test-css.mjs — node tests/run.mjs Css
// A minimal document stands in for the browser: css() only creates <style> elements and appends them to <head>.

import {describe, assert, captureConsole, releaseConsole} from './kernel.mjs'
import {css, balancedBraces} from '../src/core/css.mjs'

const head = []
globalThis.document = {
  head: {appendChild: element => head.push(element)},
  createElement: tag => ({tagName: tag.toUpperCase(), dataset: {}, textContent: ''})
}

describe('Css — one <style> per call, inserted at once', () => {
  head.length = 0
  const a = css('[as="game-aliens"] { display: grid; }')
  const b = css('.other { color: red; }')
  assert('each call adds its own element, without waiting', head.length === 2 && head[0] === a && head[1] === b)
  assert('the element is a <style>', a.tagName === 'STYLE')
  assert('the rules are kept as written', b.textContent === '.other { color: red; }')
})

describe('Css — name of the block', () => {
  const a = css(`
    /* the counter */
    [as="like-counter"],
    [as="like-button"] { font-weight: bold; }
    .x { color: red; }`)
  assert('the first selector, on one line, comments removed', a.dataset.css === '[as="like-counter"], [as="like-button"]')
  assert('an at-rule names the block', css('@media print { .x { display: none; } }').dataset.css === '@media print')
  assert('an explicit name wins', css('.x { color: red; }', {name: 'palette'}).dataset.css === 'palette')
  assert('a long selector is cut', css(`.${'a'.repeat(200)} { color: red; }`).dataset.css.length === 80)
})

describe('Css — cascade layer', () => {
  const a = css('rc-button { color: red; }', {layer: 'ricochet'})
  assert('the rules are wrapped in the layer', /^@layer ricochet \{\n[^]*\n\}$/.test(a.textContent))
  assert('the name is read before wrapping', a.dataset.css === 'rc-button')
  assert('no layer by default', !css('.x { color: red; }').textContent.includes('@layer'))
})

describe('Css — unbalanced braces', () => {
  assert('balanced rules', balancedBraces('.a { b: c; } @media print { .d { e: f; } }'))
  assert('a missing }', !balancedBraces('.a { b: c; .d { e: f; }'))
  assert('a } before its {', !balancedBraces('.a } b: c; {'))
  assert('braces in comments and strings are ignored', balancedBraces('/* { */ .a::before { content: "}"; } .b { content: \'{\'; }'))
  captureConsole()
  const style = css('[as="broken"] { color: red;')
  const lines = releaseConsole()
  assert('reported with the name of the block', lines.some(l => l.includes("unbalanced braces in '[as=\"broken\"]'")))
  assert('the block is still added: the error stays inside it', style !== null && head.includes(style))
})

describe('Css — outside a browser', () => {
  const saved = globalThis.document
  delete globalThis.document
  assert('returns null without a document', css('.x { color: red; }') === null)
  globalThis.document = saved
})
