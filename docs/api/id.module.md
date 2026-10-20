# id

Module `id` · group `utils` · source [`src/utils/id.mjs`](../../src/utils/id.mjs)

Short unique identifiers, made of lowercase letters: `'aa'`, `'ab'`… `'az'`, `'ba'`… They are cheap to make (no
random draw, no clock) and short to store, which suits the records of an application or the entities of a game.

An identifier is a **seed** followed by a **suffix**. The suffix goes from `a` to `z`; then the seed moves on, in
base 26 (`a`… `z`, `aa`, `ab`…), and the suffix starts again at `a`.

- **Kept from one session to the next.** With an `item`, the seed is a configuration item (see the `config`
  module): it is written once every 26 identifiers only, and the generator takes the next seed when the page is
  loaded again, so that an identifier is not given twice. The items must be loaded before the first identifier
  (`await config.load()`). The item is saved as any other one: 2 seconds after the change, or when the page is
  hidden; only a crash of the browser in those 2 seconds could give the same identifiers again.
- **For the session only.** Without an item, the identifiers start again at each loading of the page; `uniqueId()`
  uses such a generator.
- **Prefix.** A `prefix` makes the identifiers of two generators different: `'note-ab'`, `'task-ab'`.

```javascript
import {createIdGenerator, uniqueId} from 'ricochet/ricochet-utils.mjs'

const recordIds = createIdGenerator({item: 'app-record-seed'}) // after config.load()
const record = {id: recordIds.next(), title: 'New note'}

element.id = `field-${uniqueId()}` // unique within the page
```

`crypto.randomUUID()` gives identifiers unique across computers, but longer (36 characters) and slower to make:
keep it for data written by several computers at the same time.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `IdGenerator` | class | A generator of unique identifiers. |
| `createIdGenerator` | function | Creates a generator of unique identifiers. |
| `uniqueId` | function | An identifier unique within the page, until it is loaded again. |

## Details

### createIdGenerator()

Creates a generator of unique identifiers.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {item: string, store: object, prefix: string} | See `IdGenerator`. |

**Returns** `IdGenerator` The generator: `next()` gives an identifier.

### uniqueId()

An identifier unique within the page, until it is loaded again.

**Returns** `string` `'aa'`, `'ab'`…
