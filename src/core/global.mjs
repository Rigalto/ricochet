// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The debugging state of the kernel, shared with the console as `window.$global`: debug switches, recent logs, error
 * counters and leak counters. It is the only thing Ricochet puts on `window`; no code may depend on it to work.
 *
 * | Key | Content |
 * | --- | --- |
 * | `debug` | switches: `lifecycle` (attach/detach in the console), `eventbus` (every event), `deprecated` (first use of a deprecated method), `tasks` (undeclared microtasks, frames over budget), `strict` (an error of the application throws instead of being reported: a custom element not defined) |
 * | `logs` | the last 100 `events` and `items`, and a `timeline` mixing them |
 * | `errors` | `error`: calls of `console.error` and uncaught errors; `assert`: failed `console.assert` |
 * | `memoryLeak` | counters of live components and subscriptions: they must come back to their level after a component is detached |
 *
 * An application may create `window.$global` before loading Ricochet, to set the switches at startup; the kernel only
 * adds the keys that are missing. It adds its own switches, logs and counters with the functions of the `debug`
 * module. The guide `docs/DEBUG.md` explains every tool.
 *
 * @module global
 */

const defaults = () => ({
  debug: {lifecycle: false, eventbus: false, deprecated: false, tasks: false, strict: false},
  logs: {events: [], items: [], timeline: []},
  errors: {error: 0, assert: 0},
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
