# SearchIndex

Class `SearchIndex` · group `utils` · source [`src/utils/search.mjs`](../../src/utils/search.mjs)

An index of records by their search terms; a query finds the records holding all its terms.

## Methods

### constructor({minLength = 3, stopWords} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | object | The rules of the queries (those of `searchTerms`). |
| `options.minLength` | number | The shortest word of a query (default 3). |
| `options.stopWords` | string[]\|Set<string> | The words ignored in a query. |

### get size

The number of records.

### set(id, terms)

Puts a record in the index, or replaces its terms.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | string | The identifier of the record. |
| `terms` | string[]\|string | Its terms (`searchTerms`), or the terms separated by spaces (as stored). |

**Returns** `SearchIndex` The index.

### delete(id)

Removes a record.

| Parameter | Type | Description |
| --- | --- | --- |
| `id` | string | The identifier of the record. |

**Returns** `boolean` `true` if it was in the index.

### clear()

Removes all the records.

### query(text)

The records that hold all the terms of a query, each one as the beginning of one of their terms.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The query, as typed. |

**Returns** `string[]` The identifiers, in the order the records were first put in the index; none for a query
  without any term.
