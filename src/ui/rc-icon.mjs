// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * An icon of the icon set (`icons/iconset.mjs`), drawn in the colour of the text: it follows the palette of its block,
 * by day and by night.
 *
 * ```html
 * <rc-icon icon="save"></rc-icon>
 * <rc-icon icon="trash" size="32" label="Deleted"></rc-icon>
 * ```
 *
 * An icon is decorative by default: screen readers skip it. With a `label`, it is an image with that text.
 *
 * An unknown icon is drawn as `add`, and reported once in the console.
 *
 * @module rc-icon
 * @category ui
 * @attr {string} icon - Name of the icon in the icon set.
 * @attr {string} [size=24] - Width and height: a number of pixels, or a CSS length (`1.2em`: the size of the text).
 * @attr {string} [label] - Text for screen readers; without it, the icon is decorative.
 */

import {WComponent} from '../core/w-component.mjs'
import {css} from '../core/css.mjs'
import {iconset} from '../icons/iconset.mjs'

css(`
rc-icon { line-height: 0; vertical-align: middle; }
rc-icon svg { fill: currentColor; stroke: none; }
`, {layer: 'ricochet'})

const SVG_NS = 'http://www.w3.org/2000/svg'
const warned = new Set()

/**
 * The path of an icon of the icon set: `add` if the name is unknown (reported once).
 * @param {string|null} name - Name of the icon.
 * @returns {string} The `d` attribute of the path.
 */
export const iconPath = name => {
  if (name !== null && iconset[name] !== undefined) { return iconset[name] }
  if (name !== null && !warned.has(name)) {
    warned.add(name)
    console.warn(`rc-icon: unknown icon '${name}', 'add' drawn instead`)
  }
  return iconset.add
}

/**
 * The component of `<rc-icon>`.
 */
export class RcIcon extends WComponent {
  static observedAttributes = ['icon', 'size', 'label']
  static display = 'inline-flex'

  attach () {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('focusable', 'false')
    this.elPath = document.createElementNS(SVG_NS, 'path')
    svg.append(this.elPath)
    this.elSvg = svg
    this.element.replaceChildren(svg)
  }

  iconChanged (icon) { this.elPath.setAttribute('d', iconPath(icon)) }

  sizeChanged (size) {
    const length = /^\d*\.?\d+(?:px|em|rem)$/.test(size ?? '') ? size : `${parseInt(size ?? '24', 10) || 24}px`
    this.elSvg.style.width = length
    this.elSvg.style.height = length
  }

  labelChanged (label) {
    if (label === null || label === '') {
      this.element.removeAttribute('role')
      this.element.removeAttribute('aria-label')
      this.element.setAttribute('aria-hidden', 'true')
    } else {
      this.element.removeAttribute('aria-hidden')
      this.element.setAttribute('role', 'img')
      this.element.setAttribute('aria-label', label)
    }
  }
}
WComponent.define('rc-icon', RcIcon)
