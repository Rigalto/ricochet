# IdGenerator

Class `IdGenerator` · group `utils` · source [`src/utils/id.mjs`](../../src/utils/id.mjs)

A generator of unique identifiers.

## Methods

### constructor({item = null, store = config, prefix = ''} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {item: string, store: object, prefix: string} | `item`: the configuration item that keeps the seed; none for identifiers of the session only. `store`: the store of the item, default `config`. `prefix`: written before each identifier. |

### next()

A new identifier.

**Returns** `string` The prefix, the seed and the suffix: `'ba'`, `'note-bza'`.
