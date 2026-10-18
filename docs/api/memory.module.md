# memory

Module `memory` · group `adapters` · source [`src/adapters/memory.mjs`](../../src/adapters/memory.mjs)

A storage adapter that keeps the configuration items in memory: nothing survives a reload of the page. Useful for
tests, demonstrations, and applications that need no persistence.

```javascript
import {config} from 'ricochet/core/config.mjs'
import {MemoryAdapter} from 'ricochet/adapters/memory.mjs'

config.setAdapter(new MemoryAdapter({theme: 'dark'}))
await config.load()
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `MemoryAdapter` | class | Storage adapter for `config`, in memory. |
