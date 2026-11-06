# requests

Module `requests` · group `core` · source [`src/core/requests.mjs`](../../src/core/requests.mjs)

The log of the requests: every request that the application sends (to its server, to a web service, to Google
Drive…) is recorded in the log `ajax` of debugging (`$global.logs.ajax`, the last 100 entries, the newest first)
and in the timeline, with its time. A view of the application can show it; the console shows it with
`$global.logs.ajax`.

```javascript
import {logRequest, maskSecrets} from 'ricochet/ricochet.mjs'

const begin = Date.now()
const response = await fetch(url, {method: 'POST', body: JSON.stringify(body)})
logRequest({source: 'server', url, status: response.status, duration: Date.now() - begin, body})
console.warn('Request failed', response.status, maskSecrets(url))
```

## Keys and tokens stay out of the log

The address is masked by `maskSecrets()` before it is recorded: the value of the parameters that carry a key, a
token or a password is replaced by `***`. A key given in a header (`Authorization: Bearer …`) is never passed to
`logRequest()`, which does not take the headers. The body is recorded as it is given: the application must not
pass a body that holds a secret.

## The entries

An entry of `$global.logs.ajax` is `{source, url, status, duration, body, time}`:

| Key | Content |
| --- | --- |
| `source` | Who answers, a short name chosen by the application: `server`, `api`, `drive`, `tasks`, `cache`… |
| `url` | The address, masked. |
| `status` | The status of the HTTP answer (`200`, `404`…), or a short text when there is no answer (`error`). |
| `duration` | The duration, in milliseconds. |
| `body` | The data sent: a string as it is, an object as JSON (with a space after the commas and colons), `''` without data. |
| `time` | The time of the entry (added by `addLog()`). |

The timeline receives a shorter entry: `{ajax: 'url (status - duration ms)', detail: body}`.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `maskSecrets` | function | An address without its keys: the value of the parameters `token`, `access_token`, `refresh_token`, `id_token`, `key`, `apikey`, `api_key`, `password`, `client_secret` and `code` (in the query or in the fragment) is replaced by `***`. For the log of the requests and the console: a key must not appear there. |
| `logRequest` | function | Records a request in the log `ajax` of debugging and in the timeline, with its time. The address is masked by `maskSecrets()`. |

## Details

### maskSecrets()

An address without its keys: the value of the parameters `token`, `access_token`, `refresh_token`, `id_token`,
`key`, `apikey`, `api_key`, `password`, `client_secret` and `code` (in the query or in the fragment) is replaced by
`***`. For the log of the requests and the console: a key must not appear there.

```javascript
maskSecrets('https://api.waqi.info/feed/paris/?token=abc123') // 'https://api.waqi.info/feed/paris/?token=***'
```

| Parameter | Type | Description |
| --- | --- | --- |
| `url` | string | The address. |

**Returns** `string` The masked address.

### logRequest()

Records a request in the log `ajax` of debugging and in the timeline, with its time. The address is masked by
`maskSecrets()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `request` | {source: string, url: string, status: (number\|string), duration: number, body: *} | Who answers (`server`, `api`, `drive`…), the address, the status, the duration in milliseconds, the data sent (a string as it is, an object converted to JSON, nothing for `undefined`). |
