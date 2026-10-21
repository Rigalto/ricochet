# display

Module `display` · group `core` · source [`src/core/display.mjs`](../../src/core/display.mjs)

The display mode of the application: `pc` or `phone`. It is chosen once, when the application starts, and does not
change while it runs: resizing the window keeps the mode. The application adapts its interface to it, with CSS and
with code; it is not a responsive layout, but two versions of the interface.

- **Choice.** `phone` when the shorter side of the screen is below 600 pixels, whatever the orientation of the phone
  and the size of the window; `pc` otherwise. The configuration item `ricochet-display` forces it: `auto` (default),
  `pc` or `phone`; a change applies when the page is loaded again. To see the phone mode on a computer, set the
  item, or use the device mode of the developer tools of the browser and load the page again.
- **CSS.** The `<html>` element has the attribute `display-mode`:
  `[display-mode="phone"] rc-floating-bar { … }`.
- **Code.** `displayMode` holds the mode: `if (displayMode === 'phone') { … }`.

`start()` reads the item once the configuration items are loaded, before the interface is mounted. An application
that does not use `start()` calls `chooseDisplayMode(config.get('ricochet-display'))` at the same moment.

```javascript
import {displayMode} from 'ricochet/ricochet.mjs'

this.innerHTML(displayMode === 'phone' ? menuButton : sixIcons)
```

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `PHONE_MAX_SIDE` | const | Below this length of the shorter side of the screen, in CSS pixels, the mode is `phone`. |
| `displayMode` | const | The display mode: `pc` or `phone`. Read it after `start()` (or `chooseDisplayMode()`); it does not change later. |
| `chooseDisplayMode` | function | Chooses the display mode and writes it on `<html>`. Called by `start()`; an application without `start()` calls it once its configuration items are loaded. |

## Details

### chooseDisplayMode()

Chooses the display mode and writes it on `<html>`. Called by `start()`; an application without `start()` calls it
once its configuration items are loaded.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `setting` | string | `auto` | The value of the item `ricochet-display`: `auto`, `pc` or `phone`. |

**Returns** `string` The mode chosen.
