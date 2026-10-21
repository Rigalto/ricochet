// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The display mode of the application: `pc` or `phone`. It is chosen once, when the application starts, and does not
 * change while it runs: resizing the window keeps the mode. The application adapts its interface to it, with CSS and
 * with code; it is not a responsive layout, but two versions of the interface.
 *
 * - **Choice.** `phone` when the shorter side of the screen is below 600 pixels, whatever the orientation of the phone
 *   and the size of the window; `pc` otherwise. The configuration item `ricochet-display` forces it: `auto` (default),
 *   `pc` or `phone`; a change applies when the page is loaded again. To see the phone mode on a computer, set the
 *   item, or use the device mode of the developer tools of the browser and load the page again.
 * - **CSS.** The `<html>` element has the attribute `display-mode`:
 *   `[display-mode="phone"] rc-floating-bar { … }`.
 * - **Code.** `displayMode` holds the mode: `if (displayMode === 'phone') { … }`.
 *
 * `start()` reads the item once the configuration items are loaded, before the interface is mounted. An application
 * that does not use `start()` calls `chooseDisplayMode(config.get('ricochet-display'))` at the same moment.
 *
 * ```javascript
 * import {displayMode} from 'ricochet/ricochet.mjs'
 *
 * this.innerHTML(displayMode === 'phone' ? menuButton : sixIcons)
 * ```
 *
 * @module display
 */

/** Below this length of the shorter side of the screen, in CSS pixels, the mode is `phone`. */
export const PHONE_MAX_SIDE = 600

// the mode given by the screen: the shorter side, so that the orientation does not matter
const screenMode = () => {
  const screen = globalThis.screen
  if (screen === undefined) { return 'pc' }
  return Math.min(screen.width, screen.height) < PHONE_MAX_SIDE ? 'phone' : 'pc'
}

/**
 * The display mode: `pc` or `phone`. Read it after `start()` (or `chooseDisplayMode()`); it does not change later.
 */
export let displayMode = 'pc'

/**
 * Chooses the display mode and writes it on `<html>`. Called by `start()`; an application without `start()` calls it
 * once its configuration items are loaded.
 * @param {string} [setting=auto] - The value of the item `ricochet-display`: `auto`, `pc` or `phone`.
 * @returns {string} The mode chosen.
 */
export const chooseDisplayMode = (setting = 'auto') => {
  displayMode = setting === 'pc' || setting === 'phone' ? setting : screenMode()
  globalThis.document?.documentElement?.setAttribute('display-mode', displayMode)
  return displayMode
}

chooseDisplayMode()
