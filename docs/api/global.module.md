# global

Module `global` · group `core` · source [`src/core/global.mjs`](../../src/core/global.mjs)

The debugging state of the kernel, shared with the console as `window.$global`: debug switches, recent logs, error
counters and leak counters. It is the only thing Ricochet puts on `window`; no code may depend on it to work.

| Key | Content |
| --- | --- |
| `debug` | switches: `lifecycle` (attach/detach in the console), `eventbus` (every event), `deprecated` (first use of a deprecated method), `tasks` (undeclared microtasks, frames over budget), `strict` (an error of the application throws instead of being reported: a custom element not defined) |
| `logs` | the last 100 `events` and `items`, and a `timeline` mixing them |
| `errors` | `error`: calls of `console.error` and uncaught errors; `assert`: failed `console.assert` |
| `memoryLeak` | counters of live components and subscriptions: they must come back to their level after a component is detached |

An application may create `window.$global` before loading Ricochet, to set the switches at startup; the kernel only
adds the keys that are missing. It adds its own switches, logs and counters with the functions of the `debug`
module. The guide `docs/DEBUG.md` explains every tool.
