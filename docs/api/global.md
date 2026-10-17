# global

Module `global` · group `core` · source [`src/core/global.mjs`](../../src/core/global.mjs)

The debugging state of the kernel, shared with the console as `window.$global`: debug switches, recent logs and
leak counters. An application may create `window.$global` before loading Ricochet, with its own keys; the kernel
only adds the keys that are missing.

| Key | Content |
| --- | --- |
| `debug` | switches: `lifecycle` (attach/detach in the console), `eventbus` (every event), `deprecated` (first use of a deprecated method) |
| `logs` | the last 100 `events`, `items` and `ajax` entries, and a `timeline` mixing them |
| `memoryLeak` | counters of live subscriptions, timers and components: they must come back to their level after a component is detached |
