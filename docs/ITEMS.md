# Configuration items used by Ricochet

Ricochet keeps a few settings in the configuration items of the application (see the `config` module). An
application may read them and change them, with the values described below; it must not use their names for anything
else.

**Reserved prefix:** item names starting with `ricochet-` are reserved for Ricochet. An application does not create
items with this prefix.

| Item | Module | Values | Use |
| --- | --- | --- | --- |
| `ricochet-theme` | `theme` (`ui/theme.mjs`) | `system` (default), `day`, `night` | Day or night colours. `system` follows the setting of the computer. Changed with `setTheme()`; the `themeChanged` event tells the scheme shown. |
| `ricochet-display` | `display` (`core/display.mjs`) | `auto` (default), `pc`, `phone` | Display mode of the application, read once by `start()`: `auto` chooses by the size of the screen. A change applies when the page is loaded again. |

## Keys of the local storage

Ricochet also writes to the storage of the browser (`localStorage`, `sessionStorage`), with keys that are not
configuration items.
An application does not create keys with these prefixes.

| Key | Module | Values | Use |
| --- | --- | --- | --- |
| `ricochet-session-` | `session` (`core/session.mjs`) | a value, as JSON | Prefix of the values kept by `session.set(name, value)`, in `sessionStorage`: `ricochet-session-<name>`. |
| `ricochet-secret-` | `secrets` (`core/secrets.mjs`) | the value of a secret | Prefix of the secrets kept by `secrets.set(name, value)`: `ricochet-secret-<name>`. Never loaded as configuration items. |
