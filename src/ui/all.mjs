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
 * | `theme`, `setTheme`, `THEME_ITEM` | [theme](theme.module.md) |
 * | `RcIcon`, `iconPath` | [rc-icon](rc-icon.module.md) |
 * | `iconset`, `iconcategory`, `iconsetList`, `iconsetCount`, `iconPrivate` | [iconset](iconset.module.md) |
 * | `RcIconButton`, `RcTextButton` | [rc-icon-button](rc-icon-button.module.md), [rc-text-button](rc-text-button.module.md) |
 * | `RcCheckbox`, `RcRadio`, `RcRadioGroup` | [rc-checkbox](rc-checkbox.module.md), [rc-radio](rc-radio.module.md) |
 * | `RcInput`, `defineChecks`, `RcTextarea` | [rc-input](rc-input.module.md), [rc-textarea](rc-textarea.module.md) |
 * | `RcSelect`, `defineOptionSources`, `parseOptions` | [rc-select](rc-select.module.md) |
 * | `RcSlider` | [rc-slider](rc-slider.module.md) |
 * | `RcTabs`, `RcTab` | [rc-tabs](rc-tabs.module.md) |
 * | `RcDropdown` | [rc-dropdown](rc-dropdown.module.md) |
 * | `RcBreadcrumb`, `RcCrumb` | [rc-breadcrumb](rc-breadcrumb.module.md) |
 * | `RcDialog`, `showAlert`, `showConfirm` | [rc-dialog](rc-dialog.module.md) |
 * | `RcFloatingBar`, `RcFloatingGroup`, `RcFloatingButton` | [rc-floating](rc-floating.module.md) |
 *
 * @module all
 * @category entry
 */

export {theme, setTheme, THEME_ITEM} from './theme.mjs'
export {RcIcon, iconPath} from './rc-icon.mjs'
export {iconset, iconcategory, iconsetList, iconsetCount, iconPrivate} from '../icons/iconset.mjs'
export {RcIconButton} from './rc-icon-button.mjs'
export {RcTextButton} from './rc-text-button.mjs'
export {RcCheckbox} from './rc-checkbox.mjs'
export {RcRadio, RcRadioGroup} from './rc-radio.mjs'
export {RcInput, defineChecks} from './rc-input.mjs'
export {RcTextarea} from './rc-textarea.mjs'
export {RcSelect, defineOptionSources, parseOptions} from './rc-select.mjs'
export {RcSlider} from './rc-slider.mjs'
export {RcTabs, RcTab} from './rc-tabs.mjs'
export {RcDropdown} from './rc-dropdown.mjs'
export {RcBreadcrumb, RcCrumb} from './rc-breadcrumb.mjs'
export {RcDialog, showAlert, showConfirm} from './rc-dialog.mjs'
export {RcFloatingBar, RcFloatingGroup, RcFloatingButton} from './rc-floating.mjs'
