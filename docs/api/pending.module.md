# pending

Module `pending` · group `core` · source [`src/core/pending.mjs`](../../src/core/pending.mjs)

The changes not saved yet in a remote store (Google Drive, Google Tasks, a server…): each adapter that keeps changes
before it sends them reports how many it holds and what it is doing; the kernel adds them up and announces the
total by one event. The application shows it — a badge, a « Saving… » text — so that the user knows when
everything is saved, and can close the page.

```javascript
import {pendingWrites} from 'ricochet/ricochet.mjs'

pendingWrites.report('config', {count: 2, state: 'queued'}) // by an adapter
bus.on('pendingChanged', ({total, state}) => { … })          // by the application
```

## The states

| State | Meaning |
| --- | --- |
| `idle` | nothing waits: everything is saved |
| `queued` | changes wait a few seconds, then are sent (several changes go together) |
| `saving` | changes are being sent |
| `offline` | changes wait for a connection (the account is not connected, or its token expired) |
| `error` | the last sending failed (network, remote store); it is tried again later |

The state of the whole is the most serious state of the sources: `error`, then `offline`, `saving`, `queued`,
`idle`. A source with no change is `idle`, whatever it says.

## Interface

| Kind | Name | Direction | Description |
| --- | --- | --- | --- |
| event | `pendingChanged` | out | `{total, state, sources, savedAt}`: what waits changed. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `PendingWrites` | class | The register of the changes not saved yet. The application uses the `pendingWrites` instance. |
| `pendingWrites` | const | The register of the changes not saved yet. |
