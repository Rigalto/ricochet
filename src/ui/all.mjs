// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * Every component of the interface, the theme and the icon set, from one import. An application that uses the
 * components imports this module once, at startup: every `rc-*` tag is then defined before the interface is mounted,
 * and none can be forgotten.
 *
 * ```javascript
 * import {start} from 'ricochet/ricochet.mjs'
 * import {setTheme, showConfirm, defineChecks} from 'ricochet/ui/all.mjs'
 * ```
 *
 * Importing a component alone (`ricochet/ui/rc-select.mjs`) stays possible: it imports what it needs itself.
 *
 * | Export | Module |
 * | --- | --- |
 * | `theme`, `setTheme`, `THEME_ITEM`, `definedPalettes` | [theme](theme.module.md) |
 * | `RcIcon`, `iconPath` | [rc-icon](rc-icon.module.md) |
 * | `RcImage`, `defineImageSources`, `forgetImages` | [rc-image](rc-image.module.md) |
 * | `iconset`, `iconcategory`, `iconsetList`, `iconsetCount`, `iconPrivate` | [iconset](iconset.module.md) |
 * | `RcIconButton`, `RcTextButton` | [rc-icon-button](rc-icon-button.module.md), [rc-text-button](rc-text-button.module.md) |
 * | `RcCheckbox`, `RcRadio`, `RcRadioGroup` | [rc-checkbox](rc-checkbox.module.md), [rc-radio](rc-radio.module.md) |
 * | `RcInput`, `defineChecks`, `RcTextarea` | [rc-input](rc-input.module.md), [rc-textarea](rc-textarea.module.md) |
 * | `RcSelect`, `defineOptionSources`, `parseOptions`, `findOptionSource`, `requestOptions` | [rc-select](rc-select.module.md) |
 * | `RcCombobox` | [rc-combobox](rc-combobox.module.md) |
 * | `RcSlider` | [rc-slider](rc-slider.module.md) |
 * | `RcBarChart`, `niceMax` | [rc-bar-chart](rc-bar-chart.module.md) |
 * | `RcTabs`, `RcTab` | [rc-tabs](rc-tabs.module.md) |
 * | `RcDropdown` | [rc-dropdown](rc-dropdown.module.md) |
 * | `RcBreadcrumb`, `RcCrumb` | [rc-breadcrumb](rc-breadcrumb.module.md) |
 * | `RcMonth` | [rc-month](rc-month.module.md) |
 * | `RcDialog`, `showAlert`, `showConfirm`, `showProgress` | [rc-dialog](rc-dialog.module.md) |
 * | `RcFloatingBar`, `RcFloatingGroup`, `RcFloatingButton` | [rc-floating](rc-floating.module.md) |
 *
 * The module also brings the look of the tables, the class `rc-table` (see [table-style](table-style.module.md)).
 *
 * @module all
 * @category entry
 */

export {theme, setTheme, THEME_ITEM, definedPalettes} from './theme.mjs'
export {RcIcon, iconPath} from './rc-icon.mjs'
export {RcImage, defineImageSources, forgetImages} from './rc-image.mjs'
export {iconset, iconcategory, iconsetList, iconsetCount, iconPrivate} from '../icons/iconset.mjs'
export {RcIconButton} from './rc-icon-button.mjs'
export {RcTextButton} from './rc-text-button.mjs'
export {RcCheckbox} from './rc-checkbox.mjs'
export {RcRadio, RcRadioGroup} from './rc-radio.mjs'
export {RcInput, defineChecks} from './rc-input.mjs'
export {RcTextarea} from './rc-textarea.mjs'
export {RcSelect, defineOptionSources, parseOptions, findOptionSource, requestOptions} from './rc-select.mjs'
export {RcCombobox} from './rc-combobox.mjs'
export {RcSlider} from './rc-slider.mjs'
export {RcBarChart, niceMax} from './rc-bar-chart.mjs'
export {RcTabs, RcTab} from './rc-tabs.mjs'
export {RcDropdown} from './rc-dropdown.mjs'
export {RcBreadcrumb, RcCrumb} from './rc-breadcrumb.mjs'
export {RcMonth} from './rc-month.mjs'
export {RcDialog, showAlert, showConfirm, showProgress} from './rc-dialog.mjs'
export {RcFloatingBar, RcFloatingGroup, RcFloatingButton} from './rc-floating.mjs'
import './table-style.mjs'
