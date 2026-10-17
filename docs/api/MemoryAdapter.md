# MemoryAdapter

Class `MemoryAdapter` · group `adapters` · source [`src/adapters/memory.mjs`](../../src/adapters/memory.mjs)

Storage adapter for `config`, in memory.

## Methods

### constructor(items = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | object | Initial items, as `{item: value, …}`. |

### async load()

**Returns** `Promise<object>` A copy of every item.

### async save(entries)

| Parameter | Type | Description |
| --- | --- | --- |
| `entries` | Array<{item: string, value: string}> | The items to store. |

### async remove(items)

| Parameter | Type | Description |
| --- | --- | --- |
| `items` | string[] | The names of the items to delete. |
