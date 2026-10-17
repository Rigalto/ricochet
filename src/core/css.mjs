// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Styles written next to the component that uses them.
 *
 * `css(rules)` is called once, when the module of a component is loaded. It adds one `<style>` element at the end of
 * `<head>`, at once: the rules apply before the component is mounted, so it is never shown without its styles. The
 * browser recalculates styles once before the next frame, however many `<style>` elements were added.
 *
 * - **One block per call.** A syntax error, such as a missing `}`, only breaks the rules of its own block. Unbalanced
 *   braces are reported in the console, with the name of the block.
 * - **A name for each block.** The `data-css` attribute of the `<style>` element holds the first selector of the
 *   rules (`[as="game-aliens"]`), or the name given in the options: the inspector shows where each rule comes from.
 * - **Layers.** The components of Ricochet put their rules in the `ricochet` cascade layer. Rules outside any layer,
 *   which is the default for an application, always win over rules in a layer, whatever their specificity and their
 *   order: an application overrides the look of a kernel component without fighting its selectors.
 *
 * ```javascript
 * import {css} from 'ricochet/core/css.mjs'
 *
 * css(`
 * [as="like-counter"] { font-weight: bold; }
 * `)
 * ```
 *
 * Editors highlight the CSS of the template when it is preceded by a comment holding the word `css`, as in the
 * components of Ricochet.
 *
 * @module css
 */

const NAME_LENGTH = 80

// the text before the first '{', on one line: the selector of the first rule, or an at-rule such as '@media print'
const firstSelector = rules => {
  const brace = rules.indexOf('{')
  const head = brace === -1 ? rules : rules.slice(0, brace)
  return head.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_LENGTH)
}

/**
 * Checks that the braces of CSS rules are balanced, ignoring comments and strings.
 * @param {string} rules - CSS rules.
 * @returns {boolean} `true` when every `{` is closed, and no `}` comes before its `{`.
 */
export function balancedBraces (rules) {
  const text = rules.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '')
  let depth = 0
  for (const char of text) {
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth < 0) { return false }
    }
  }
  return depth === 0
}

/**
 * Adds CSS rules to the page, at once, in a `<style>` element of their own.
 * @param {string} rules - Complete CSS rules, with their selectors and braces.
 * @param {{name: string, layer: string}} [options] - `name` of the block (default: the first selector);
 *   cascade `layer` that holds the rules (default: none).
 * @returns {HTMLStyleElement|null} The `<style>` element, or `null` outside a browser.
 */
export function css (rules, {name, layer} = {}) {
  const text = rules.trim()
  const blockName = name ?? firstSelector(text)
  if (!balancedBraces(text)) { console.error(`css: unbalanced braces in '${blockName}'`) }
  if (typeof document === 'undefined') { return null }
  const style = document.createElement('style')
  style.dataset.css = blockName
  style.textContent = layer === undefined ? text : `@layer ${layer} {\n${text}\n}`
  document.head.appendChild(style)
  return style
}
