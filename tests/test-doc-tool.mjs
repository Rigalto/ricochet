// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

// tests/test-doc-tool.mjs — node tests/run.mjs DocTool
// The documentation generator (tools/doc.mjs), run on a small application written in a temporary folder: the index
// (name, kind, parent, group, source, page, element, summary), the guides, the classes without a block, French.

import {describe, assert} from './kernel.mjs'
import {execFileSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const TOOL = join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'doc.mjs')

const SOURCE = `/**
 * Helpers of the demo.
 * @module helpers
 */

/** Adds two **numbers**. Then says nothing. */
export const add = (a, b) => a + b

/**
 * A card of the demo, see [the guide](../GUIDE.md) and \`card-x\`.
 * Second line of the first paragraph.
 *
 * Second paragraph.
 * @attr {string} [size=small] - The size.
 * @fires {{id: string}} cardOpened - The card was opened.
 */
export class DemoCard extends WComponent {
  /**
   * Opens the card.
   * @yields {number} A step.
   */
  open () {}
}
WComponent.define('demo-card', DemoCard)

class Hidden {
}
`

// writes the application, runs the tool with the given arguments, returns the index and the folder
const run = args => {
  const root = mkdtempSync(join(tmpdir(), 'doc-tool-'))
  mkdirSync(join(root, 'components', 'cards'), {recursive: true})
  writeFileSync(join(root, 'components', 'cards', 'demo.mjs'), SOURCE)
  mkdirSync(join(root, 'docs'))
  writeFileSync(join(root, 'docs', 'GUIDE.md'), '# Using the demo\n\nThe **first** sentence. The second one.\n')
  const output = execFileSync(process.execPath, [TOOL, ...args, 'components'], {cwd: root, encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']})
  const index = JSON.parse(readFileSync(join(root, 'docs', 'api', 'index.json'), 'utf8'))
  const page = name => readFileSync(join(root, 'docs', 'api', name), 'utf8')
  const exists = name => existsSync(join(root, 'docs', 'api', name))
  return {root, index, page, exists, output}
}

describe('DocTool — the index', () => {
  const {root, index, page, exists} = run([])
  const card = index.find(e => e.n === 'DemoCard')
  assert('a class: kind, parent, group, source, page', card.k === 'c' && card.e === 'WComponent' && card.g === 'cards' &&
    card.s === 'components/cards/demo.mjs' && card.p === 'DemoCard.md')
  assert('the element', card.t === 'demo-card')
  assert('the summary: first sentence, plain text', card.d === 'A card of the demo, see the guide and card-x.')
  const module = index.find(e => e.n === 'helpers')
  assert('a module', module.k === 'm' && module.p === 'helpers.module.md' && module.t === '' &&
    module.d === 'Helpers of the demo.')
  assert('a class without a block is listed', index.some(e => e.n === 'Hidden') && exists('Hidden.md'))
  assert('no guide without the option', !index.some(e => e.k === 'g'))
  assert('English pages', page('DemoCard.md').includes('Class `DemoCard` extends') && page('DemoCard.md').includes('## Interface') &&
    page('DemoCard.md').includes('| attribute | `size` | in |') && page('DemoCard.md').includes('**Yields** `number` A step.') && page('Hidden.md').includes('*Not documented yet.*'))
  rmSync(root, {recursive: true, force: true})
})

describe('DocTool — the options', () => {
  const {root, index, page, exists, output} = run(['--lang', 'fr', '--documented', '--guides', 'docs'])
  assert('--documented: the class without a block is ignored', !index.some(e => e.n === 'Hidden') && !exists('Hidden.md'))
  assert('--documented: no warning for it', output.includes('0 warning(s)'))
  const guide = index.find(e => e.k === 'g')
  assert('--guides: the title, the page, the first sentence', guide.n === 'Using the demo' && guide.p === '../GUIDE.md' &&
    guide.s === 'docs/GUIDE.md' && guide.g === 'guides' && guide.d === 'The first sentence.')
  assert('--guides: counted', output.includes('1 guides'))
  const text = page('DemoCard.md')
  assert('--lang fr: the facts', text.includes('Classe `DemoCard` hérite de `WComponent` · élément `<demo-card>` · groupe `cards`'))
  assert('--lang fr: the Interface table', text.includes('| Type | Nom | Sens | Contenu | Description |') &&
    text.includes('| attribut | `size` | entrée |') && text.includes('| événement | `cardOpened` | sortie |'))
  assert('--lang fr: the methods', text.includes('## Méthodes') && text.includes('**Produit** `number` A step.'))
  assert('--lang fr: the list', page('README.md').includes('entrées, générées par'))
  rmSync(root, {recursive: true, force: true})
  let failed = false
  try { run(['--lang', 'xx']) } catch { failed = true }
  assert('an unknown language stops the tool', failed)
})
