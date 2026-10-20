# hash

Module `hash` · group `utils` · source [`src/utils/hash.mjs`](../../src/utils/hash.mjs)

Hashes of texts and data.

| Function | Result | Use |
| --- | --- | --- |
| `djb2(text)` | an integer from 0 to 2³² - 1 | a quick key for a cache, a seed for `Random` |
| `djb2String(text)` | a short string of letters and digits (about 12 characters) | a key with fewer collisions |
| `sha256(data)` | a promise of 64 hexadecimal characters | to compare two versions of a file, to check a download |

`djb2` (Daniel J. Bernstein) is fast but not secure: two texts may share a hash, and a hash is easy to forge. Use
`sha256()` (the Web Crypto API of the browser) when that matters.

```javascript
import {djb2, sha256} from 'ricochet/ricochet-utils.mjs'

const key = djb2(url)
if (await sha256(newText) !== savedHash) { save(newText) }
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `djb2` | function | Hash djb2 (xor variant) of a text. |
| `djb2String` | function | Two djb2 hashes of a text (its even and its odd characters), written in base 36: fewer collisions than `djb2()`. |
| `sha256` | function | SHA-256 hash, with the Web Crypto API. |

## Details

### djb2()

Hash djb2 (xor variant) of a text.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |

**Returns** `number` An integer from 0 to 4 294 967 295.

### djb2String()

Two djb2 hashes of a text (its even and its odd characters), written in base 36: fewer collisions than `djb2()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `text` | string | The text. |

**Returns** `string` A string of letters and digits, at most 14 characters.

### sha256()

SHA-256 hash, with the Web Crypto API.

| Parameter | Type | Description |
| --- | --- | --- |
| `data` | string\|ArrayBuffer\|ArrayBufferView | A text (encoded in UTF-8) or binary data. |

**Returns** `Promise<string>` The hash, in 64 lowercase hexadecimal characters.
