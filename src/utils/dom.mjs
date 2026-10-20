// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Small helpers around the DOM and the browser: escaping text for HTML, building elements from HTML strings,
 * sanitizing HTML of external origin, and the clipboard.
 *
 * ## Which tool for which data
 *
 * | Situation | Tool |
 * | --- | --- |
 * | Write a value into an existing node | `element.textContent` or `setAttribute` |
 * | Insert a value into an HTML template (`innerHTML`) | `escapeHtml()` |
 * | Display a Markdown text | `markdownToHtml()` in `utils/markdown.mjs` |
 * | Display HTML or SVG of external origin | `sanitizeHtml()` |
 *
 * ## Sanitizing
 *
 * Ricochet has no dependency, so it does not sanitize HTML by itself. The application registers its sanitizer once,
 * at startup, for instance with DOMPurify:
 *
 * ```js
 * import {setSanitizer} from 'ricochet/utils/dom.mjs'
 *
 * setSanitizer(html => DOMPurify.sanitize(html, {ADD_TAGS: ['use'], ADD_ATTR: ['target', 'icon', 'as']}))
 * ```
 *
 * Until a sanitizer is registered, `sanitizeHtml()` escapes its input: the HTML is shown as text, never run.
 *
 * @module dom
 */

const HTML_ESCAPES = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}

/**
 * Escapes `&`, `<`, `>` and `"` so that a text can be inserted in HTML, inside an element or an attribute.
 * @param {string} text - Text to escape.
 * @returns {string} The escaped text.
 */
export const escapeHtml = text => String(text).replace(/[&<>"]/g, c => HTML_ESCAPES[c])

const HTML_ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' '}

/**
 * The inverse of `escapeHtml()`: replaces the entities `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, `&nbsp;` and
 * the numeric ones (`&#39;`, `&#x27;`) by their characters. Other named entities are left as they are.
 * @param {string} text - Text holding entities.
 * @returns {string} The text with its characters.
 */
export const unescapeHtml = text => String(text).replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
  if (name[0] === '#') {
    const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity
  }
  return HTML_ENTITIES[name.toLowerCase()] ?? entity
})

let sanitizer = null

/**
 * Registers the function used by `sanitizeHtml()`. Called once by the application, at startup.
 * @param {Function} fn - Receives an HTML string, returns the sanitized HTML string.
 */
export const setSanitizer = fn => { sanitizer = fn }

/**
 * Removes the dangerous parts (scripts, event handlers, `javascript:` links) of an HTML string of external origin,
 * with the sanitizer registered by `setSanitizer()`. Without a registered sanitizer, the input is escaped.
 * @param {string} html - HTML to sanitize.
 * @returns {string} HTML safe to insert with `innerHTML`.
 */
export const sanitizeHtml = html => {
  if (sanitizer === null) {
    console.error('sanitizeHtml: no sanitizer registered (see setSanitizer), the HTML is escaped')
    return escapeHtml(html)
  }
  return sanitizer(html)
}

/**
 * Builds an element from an HTML string, without inserting it in the page. A `<template>` is used, so images are not
 * loaded and elements such as `<tr>` or `<option>` are accepted.
 * @param {string} html - HTML of one element. Only the first element is returned.
 * @returns {Element|null} The element, or `null` if the string holds none.
 */
export const createElementFromHTML = html => {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  return template.content.firstElementChild
}

/**
 * Builds an SVG element (`<path>`, `<g>`, `<circle>`…) from a string, in the SVG namespace, without inserting it in
 * the page.
 * @param {string} html - SVG markup of one element. Only the first element is returned.
 * @returns {Element|null} The SVG element, or `null` if the string holds none.
 */
export const createSvgElementFromHTML = html => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.innerHTML = html
  return svg.firstElementChild
}

const CLIPBOARD_ERROR = 'The clipboard needs a secure context (https or localhost)'

/**
 * Reads the text of the clipboard. The browser may ask the user for permission.
 * @param {Function} [recall] - Called with the text. Optional: the text is also returned as a promise.
 * @returns {Promise<string>} The text of the clipboard; rejected if the clipboard is not available.
 */
export const readClipboard = recall => {
  if (navigator.clipboard === undefined) {
    console.error(CLIPBOARD_ERROR)
    return Promise.reject(new Error(CLIPBOARD_ERROR))
  }
  return navigator.clipboard.readText().then(text => {
    recall?.(text)
    return text
  })
}

/**
 * Writes a text in the clipboard.
 * @param {string} text - Text to copy.
 * @returns {Promise<void>} Resolved once the text is copied; rejected if the clipboard is not available.
 */
export const writeClipboard = text => {
  if (navigator.clipboard === undefined) {
    console.error(CLIPBOARD_ERROR)
    return Promise.reject(new Error(CLIPBOARD_ERROR))
  }
  return navigator.clipboard.writeText(text)
}

/**
 * Reads the size of an SVG image from the `viewBox` attribute of its source.
 * @param {string} svg - Source of the SVG image.
 * @returns {{width: number, height: number}|null} The size, or `null` if there is no valid `viewBox`.
 */
export const svgToWidthHeight = svg => {
  const match = /viewBox\s*=\s*["']([^"']*)["']/.exec(svg)
  if (match === null) { return null }
  const coords = match[1].trim().split(/[\s,]+/).map(Number)
  if (coords.length !== 4 || coords.some(Number.isNaN)) { return null }
  return {width: coords[2], height: coords[3]}
}
