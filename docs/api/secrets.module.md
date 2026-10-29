# secrets

Module `secrets` · group `core` · source [`src/core/secrets.mjs`](../../src/core/secrets.mjs)

The store of secrets: API keys, tokens, passwords that the user gives to the application, and that must stay on
this computer. One instance, `secrets`, serves the whole application.

```javascript
import {secrets} from 'ricochet/ricochet.mjs'

secrets.set('aqicn', token)        // given by the user in a field of the interface
const token = secrets.get('aqicn') // null when the user has not given it yet
```

## Secrets and configuration items

A secret is not a configuration item. The configuration items go through the adapter of the application, to a
server or a shared file, and are written to the logs of debugging; a secret never leaves the browser:

- it is kept in the local storage of the browser (`localStorage`), never given to an adapter nor sent anywhere by
  the kernel;
- its value is never written to the logs, nor to the console, nor in the payload of an event;
- it is read at once (`get()` is synchronous): a view reads its key when it sends its request.

A name is a short identifier chosen by the application (`aqicn`, `mqtt-password`). The value is a string; spaces
around it are removed (a key copied from a web page often carries one), and an empty value removes the secret.

## Changes

`set()` and `remove()` emit `secretChanged {name}`, without the value: a view that waits for its key listens to it
and sends its request again. The event is also emitted when the secret is changed in another tab of the same site.

## One browser, one computer

A secret is kept for this browser on this computer: in another browser, on another computer (or after the data of the
site is cleared), the user gives it again. The interface that asks for it says so, and tells where to find it.

## Safety

The local storage of the browser is not a safe. It is shared by every page of the same origin (the same scheme,
host and port): on `https://user.github.io`, every application of the account reads the secrets of the others —
fine when they are all yours. Anyone who uses this browser session can read them in the tools of the browser. The
store keeps secrets out of the code, out of the repository and out of the servers; it does not hide them from the
user of the computer.

When the browser offers no local storage, or refuses it (some private windows), the store warns once in the console
and keeps the secrets in memory: they are lost when the page is closed.

## Interface

| Kind | Name | Direction | Description |
| --- | --- | --- | --- |
| event | `secretChanged` | out | A secret is set or removed. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `SecretStore` | class | A store of secrets. The application uses the `secrets` instance; other instances are useful for tests. |
| `secrets` | const | The store of secrets of the application. |
