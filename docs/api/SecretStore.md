# SecretStore

Class `SecretStore` · group `core` · source [`src/core/secrets.mjs`](../../src/core/secrets.mjs)

A store of secrets. The application uses the `secrets` instance; other instances are useful for tests.

## Methods

### constructor({storage = null, prefix = PREFIX} = {})

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {storage: Storage, prefix: string} | `storage`: the object that keeps the secrets, with the interface of `localStorage` (default: `localStorage`); `prefix` of the keys in the storage (default `ricochet-secret-`). |

### get inMemory

Whether the secrets are kept in memory only, the local storage being unavailable.

### get(name)

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the secret. |

**Returns** `string|null` The value of the secret, or `null` when it is not set.

### has(name)

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the secret. |

**Returns** `boolean` Whether the secret is set.

### set(name, value)

Sets a secret; an empty value (after removing the spaces around it) removes it.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the secret. |
| `value` | string | Its value. |

### remove(name)

Removes a secret.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | Name of the secret. |

### names()

**Returns** `string[]` The names of the secrets that are set, in alphabetical order.
