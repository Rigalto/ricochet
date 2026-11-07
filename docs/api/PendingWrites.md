# PendingWrites

Class `PendingWrites` · group `core` · source [`src/core/pending.mjs`](../../src/core/pending.mjs)

The register of the changes not saved yet. The application uses the `pendingWrites` instance.

## Methods

### report(source, {count = 0, state = 'idle', saved = false} = {})

Reports what a source holds. An event `pendingChanged` is emitted when the total, the state of the whole, or the
state of the source changes.

| Parameter | Type | Description |
| --- | --- | --- |
| `source` | string | The name of the source (`config`, `cards`, `tasks`…). |
| `report` | {count: number, state: string} | The number of changes that wait, and the state of the source (`idle`, `queued`, `saving`, `offline`, `error`); `saved: true` when a sending just succeeded. |

### get total

The number of changes that wait, all sources together.

### get state

The state of the whole: the most serious state of the sources.

### get savedAt

The time of the last sending that succeeded (milliseconds since 1970), or `0`.

### get summary

`{total, state, sources: {source: {count, state}}, savedAt}`: the payload of `pendingChanged`.
