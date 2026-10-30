# all

Module `all` · group `entry` · source [`src/ui/all.mjs`](../../src/ui/all.mjs)

Every component of the interface, the theme and the icon set, from one import. An application that uses the
components imports this module once, at startup: every `rc-*` tag is then defined before the interface is mounted,
and none can be forgotten.

```javascript
import {start} from 'ricochet/ricochet.mjs'
import {setTheme, showConfirm, defineChecks} from 'ricochet/ui/all.mjs'
```

Importing a component alone (`ricochet/ui/rc-select.mjs`) stays possible: it imports what it needs itself.

| Export | Module |
| --- | --- |
| `theme`, `setTheme`, `THEME_ITEM`, `definedPalettes` | [theme](theme.module.md) |
| `RcIcon`, `iconPath` | [rc-icon](rc-icon.module.md) |
| `iconset`, `iconcategory`, `iconsetList`, `iconsetCount`, `iconPrivate` | [iconset](iconset.module.md) |
| `RcIconButton`, `RcTextButton` | [rc-icon-button](rc-icon-button.module.md), [rc-text-button](rc-text-button.module.md) |
| `RcCheckbox`, `RcRadio`, `RcRadioGroup` | [rc-checkbox](rc-checkbox.module.md), [rc-radio](rc-radio.module.md) |
| `RcInput`, `defineChecks`, `RcTextarea` | [rc-input](rc-input.module.md), [rc-textarea](rc-textarea.module.md) |
| `RcSelect`, `defineOptionSources`, `parseOptions` | [rc-select](rc-select.module.md) |
| `RcSlider` | [rc-slider](rc-slider.module.md) |
| `RcTabs`, `RcTab` | [rc-tabs](rc-tabs.module.md) |
| `RcDropdown` | [rc-dropdown](rc-dropdown.module.md) |
| `RcBreadcrumb`, `RcCrumb` | [rc-breadcrumb](rc-breadcrumb.module.md) |
| `RcMonth` | [rc-month](rc-month.module.md) |
| `RcDialog`, `showAlert`, `showConfirm` | [rc-dialog](rc-dialog.module.md) |
| `RcFloatingBar`, `RcFloatingGroup`, `RcFloatingButton` | [rc-floating](rc-floating.module.md) |

The module also brings the look of the tables, the class `rc-table` (see [table-style](table-style.module.md)).
