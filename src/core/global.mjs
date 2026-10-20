// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The debugging state of the kernel, shared with the console as `window.$global`: debug switches, recent logs and
 * leak counters. An application may create `window.$global` before loading Ricochet, with its own keys; the kernel
 * only adds the keys that are missing.
 *
 * | Key | Content |
 * | --- | --- |
 * | `debug` | switches: `lifecycle` (attach/detach in the console), `eventbus` (every event), `deprecated` (first use of a deprecated method), `tasks` (undeclared microtasks, frames over budget), `strict` (an error of the application throws instead of being reported: a custom element not defined) |
 * | `logs` | the last 100 `events`, `items` and `ajax` entries, and a `timeline` mixing them |
 * | `memoryLeak` | counters of live subscriptions, timers and components: they must come back to their level after a component is detached |
 *
 * @module global
 */

const defaults = () => ({
  debug: {lifecycle: false, eventbus: false, deprecated: false, tasks: false, strict: false},
  logs: {events: [], items: [], ajax: [], timeline: []},
  memoryLeak: {
    attached: 0,
    setInterval: 0,
    animationframe: 0,
    eventHandlers: 0,
    windowEventHandlers: 0,
    domEventHandlers: 0,
    configObserver: 0,
    microtasks: 0,
    scheduledTasks: 0,
    ajaxObserver: 0,
    consoleError: 0,
    consoleAssert: 0,
  },
})

const createGlobal = () => {
  const state = globalThis.$global ?? {}
  for (const [key, value] of Object.entries(defaults())) {
    if (state[key] === undefined) {
      state[key] = value
    } else {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (state[key][subKey] === undefined) { state[key][subKey] = subValue }
      }
    }
  }
  globalThis.$global = state
  return state
}

/** The debugging state, the same object as `window.$global`. */
export const $global = createGlobal()
