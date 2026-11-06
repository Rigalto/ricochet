# google

Module `google` · group `adapters` · source [`src/adapters/google.mjs`](../../src/adapters/google.mjs)

The connection to a Google account, and the calls to the APIs of Google (Drive, Sheets, Tasks…) with its token: an
application without any server reaches the data of its user in the user's own Google account.

```javascript
import {googleAccount} from 'ricochet/adapters/google.mjs'

await googleAccount.configure({clientId: '….apps.googleusercontent.com', scopes: [DRIVE_FILE]})
// in the click handler of a « Sign in with Google » button (the browser opens the window of Google only after a click)
googleAccount.signIn()
// anywhere, once connected
const files = await googleAccount.request('https://www.googleapis.com/drive/v3/files', {query: {q: "trashed = false"}, source: 'drive'})
```

The module is not exported by `ricochet.mjs`: an application that does not use Google does not load it, and the
library of Google (Google Identity Services, from `accounts.google.com`, the only script that Ricochet loads from
another site) is loaded by `configure()` only.

## The client identifier

The application is declared once in the console of Google Cloud: a project, the APIs it calls, its consent screen,
and a client identifier of type « Web application » whose authorized JavaScript origins are the sites of the
application (`https://user.github.io`, `http://localhost`). The client identifier is public — it is sent to every
browser — and can be written in the code; there is no client secret in a browser.

## The token

The user signs in once and accepts the access asked by the application (the scopes). Google then gives an access
token, valid about one hour, and no refresh token: a page without a server cannot get one.

- **Kept in this browser.** The token, its time of expiry, the scopes granted and the address of the account are kept
  as a secret (`secrets`, name `google-account`): a reload, or another tab of the site, stays connected until the
  expiry. The token is never in a configuration item, in the payload of an event, nor in a log (the requests are
  logged by `logRequest()`, which takes no header).
- **Renewed at a click.** The browser opens the window of Google only in the handler of a click. In the last
  minutes of the token (`margin`, 5 minutes by default), the next click of the user anywhere in the page asks for a
  new one: the user already agreed and is signed in to Google in this browser, so the window opens and closes at
  once, without any question (the address of the account is given as a hint, so that Google does not ask which
  account to use). If the user is no longer signed in to Google, the window asks for the account: rare.
- **Expired.** When the token is expired, `googleExpired` is emitted: the application shows a « Reconnect to Google »
  button, whose click calls `signIn()`. Meanwhile, the requests wait; they are sent once the account is connected
  again.

## The states

`state` is `signed-out` (no account), `connected` (a valid token) or `expired` (an account, its token expired). Each
change emits an event, also when it comes from another tab of the site:

| Event | Payload | When |
| --- | --- | --- |
| `googleConnected` | `{email}` | a token is received (sign in, reconnection; not a renewal before the expiry) |
| `googleExpired` | `{email}` | the token is expired; a click on « Reconnect » calls `signIn()` |
| `googleDisconnected` | `{revoked}` | `signOut()`: the token is forgotten; `revoked`: the access was also withdrawn at Google |

## Signing out

`signOut()` forgets the token in this browser; `signOut({revoke: true})` also withdraws the access of the
application at Google (the next sign in asks for the consent again). The application erases what it keeps of the
user's data in this browser when it receives `googleDisconnected`. Signing out of the application does not sign the
user out of Google: on a shared computer, the user must also sign out of Google.

## The requests

`request(url, options)` sends a request with the token, logs it (`logRequest()`, with its `source`), and returns
the answer read as JSON (or as text, or as a `Blob`). Without a token (expired), it waits for the reconnection;
signed out, it fails. A `401` answer marks the token as expired, then the request waits and is sent again once.
Another error fails with a `GoogleError` (`status`, `message` of Google).

## Interface

| Kind | Name | Direction | Description |
| --- | --- | --- | --- |
| event | `googleConnected` | out | A token is received. |
| event | `googleExpired` | out | The token is expired. |
| event | `googleDisconnected` | out | The account is signed out. |

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `GOOGLE_EMAIL` | const | The scope to read the address of the account. |
| `GOOGLE_DRIVE_FILE` | const | The scope of the files created or opened by the application in Google Drive (no verification of the application). |
| `GOOGLE_TASKS` | const | The scope of Google Tasks, read and write. |
| `GoogleError` | class | An error answered by an API of Google. |
| `GoogleAccount` | class | The connection to a Google account. The application uses the `googleAccount` instance; other instances are useful for tests. |
| `googleAccount` | const | The connection to the Google account of the user. |
