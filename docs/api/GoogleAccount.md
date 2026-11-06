# GoogleAccount

Class `GoogleAccount` · group `adapters` · source [`src/adapters/google.mjs`](../../src/adapters/google.mjs)

The connection to a Google account. The application uses the `googleAccount` instance; other instances are useful
for tests.

## Methods

### get state

`signed-out`, `connected` or `expired`.

### get connected

Whether a valid token is held.

### get email

The address of the account, or `''`.

### get expiresAt

The time of expiry of the token (milliseconds since 1970), or `0`.

### get scopes

The scopes granted by the user.

### hasScopes(scopes)

Whether the user granted these scopes.

| Parameter | Type | Description |
| --- | --- | --- |
| `scopes` | string[] | The scopes. |

**Returns** `boolean` 

### async configure({clientId, scopes = [], margin = 300})

Prepares the connection: loads the library of Google, takes back the account kept in this browser, and listens to
the clicks (renewal) and to the other tabs. To call once, at the start of the application.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {clientId: string, scopes: string[], margin: number} | The client identifier; the scopes asked at sign in (`email` is always added); the delay, in seconds, before the expiry from which a click renews the token (default 300). |

**Returns** `Promise<string>` The state.

### signIn({scopes = []} = {})

Signs in, or reconnects: opens the window of Google. To call in the handler of a click.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | {scopes: string[]} | More scopes to ask for (asked once, when a view needs them: Tasks…). |

### signOut({revoke = false} = {})

Signs out: forgets the token in this browser; with `revoke`, also withdraws the access of the application at
Google. The requests waiting for a token fail.

| Parameter | Type |
| --- | --- |
| `options` | {revoke: boolean} |

### userGesture()

Called at each click of the user (capture): in the last minutes of a valid token, asks for a new one (the browser
allows the window of Google in a click). Once the token is expired, nothing: the application shows its
« Reconnect » button (`googleExpired`), so that a click elsewhere never opens the window of Google. Kernel
internal; public for the tests.

### check()

Checks the expiry now (called when it is due, and when the page is shown again).

**Returns** `string` The state.

### token()

A valid token, at once when connected; when expired, once the user reconnects.

**Returns** `Promise<string>` The token; rejected with a `GoogleError` (`signed-out`) when no account is connected.

### async request(url, {method = 'GET', query = null, body, headers = {}, source = 'google', answer = 'json'} = {}, retried = false)

Sends a request to an API of Google, with the token, and logs it.

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | string | The address. |
| `options` | object |  |
| `options.method` | string | `GET` (default), `POST`, `PATCH`, `PUT`, `DELETE`. |
| `options.query` | Object<string, *> | The parameters added to the address. |
| `options.body` | * | An object or an array is sent as JSON; a string, a `Blob` or a `FormData` as it is. |
| `options.headers` | Object<string, string> | More headers. |
| `options.source` | string | The source in the log of the requests (default `google`). |
| `options.answer` | string | How the answer is read: `json` (default; `null` for an empty answer), `text`, `blob`. |

**Returns** `Promise<*>` The answer.
