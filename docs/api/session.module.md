# session

Module `session` · group `core` · source [`src/core/session.mjs`](../../src/core/session.mjs)

The store of the session: state that lives as long as the tab, survives a reload of the page, and is not worth a
configuration item (the pages seen lately, the place in a list, a draft). One instance, `session`, serves the whole
application.

```javascript
import {session} from 'ricochet/ricochet.mjs'

session.set('history', [{path: '#hom/not'}])   // any value that JSON can write
const history = session.get('history', [])     // the default when nothing is stored
```

## Session and configuration items

| | Configuration items (`config`) | Session (`session`) |
| --- | --- | --- |
| lives | until changed | as long as the tab: a reload keeps it, a new tab starts empty |
| stored | by the adapter of the application (a server, Drive, the local database) | in the browser (`sessionStorage`), never sent anywhere |
| values | strings | anything JSON can write |
| changes | observers, logs | none: read when needed |

A name is a short identifier chosen by the application, prefixed by the store in the storage of the browser
(`ricochet-session-<name>`). A value is written at once (`set()` is synchronous): it is not lost when the page is
closed just after.

When the browser offers no session storage, or refuses it (some private windows), the store warns once in the
console and keeps the values in memory: they are lost when the page is reloaded.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `SessionStore` | class | A store of session values. The application uses the `session` instance; other instances are useful for tests. |
| `session` | const | The store of the session of the application. |
