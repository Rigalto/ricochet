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
