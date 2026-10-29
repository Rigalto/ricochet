// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The entry point of the kernel: the classes and functions an application uses, from one import, without knowing the
 * folders of Ricochet.
 *
 * ```javascript
 * import {WComponent, start, router} from 'ricochet/ricochet.mjs'
 * ```
 *
 * It loads the kernel only, not the components of the interface nor the icon set: those are in `ui/all.mjs`, which an
 * application imports once, at startup, when it uses them. Each module stays importable alone
 * (`ricochet/core/w-component.mjs`…), and its page of the [API reference](README.md) is the reference.
 *
 * | Export | Module |
 * | --- | --- |
 * | `WComponent`, `WController` | [w-component](WComponent.md), [w-controller](WController.md) |
 * | `start` | [start](start.module.md) |
 * | `router` | [router](router.module.md) |
 * | `universeBrickResolver` | [universe-brick](universe-brick.module.md) |
 * | `config`, `itemStore`, `setItemStore` | [config](config.module.md), [items](items.module.md) |
 * | `MemoryAdapter` | [memory](memory.module.md) |
 * | `IndexedDBAdapter` | [indexeddb](indexeddb.module.md) |
 * | `keyboard` | [keyboard](keyboard.module.md) |
 * | `runActions`, `runDoubleClickActions`, `isDisabled` | [actions](actions.module.md) |
 * | `css` | [css](css.module.md) |
 * | `declareTasks`, `defer`, `schedule`, `cancel` | [microtasker](microtasker.module.md), [scheduler](scheduler.module.md) |
 * | `loop`, `realClock`, `gameClock` | [loop](loop.module.md), [clock](clock.module.md) |
 * | `displayMode`, `chooseDisplayMode` | [display](display.module.md) |
 * | `$global`, `quietEvents`, `addDebugSwitches`, `trace`, `addLog`, `countLeak`, `leakSnapshot`, `leakChanges` | [global](global.module.md), [debug](debug.module.md) |
 * | `escapeHtml`, `unescapeHtml`, `setSanitizer`, `sanitizeHtml`, `createElementFromHTML`, `createSvgElementFromHTML`, `readClipboard`, `writeClipboard`, `svgToWidthHeight` | [dom](dom.module.md) |
 * | `markdownToHtml` | [markdown](markdown.module.md) |
 *
 * The bus itself (`core/bus.mjs`) is not exported: components use `listen()` and `emit()`. The utilities (dates,
 * numbers, random numbers…) have their own entry point, [ricochet-utils](ricochet-utils.module.md).
 *
 * @module ricochet
 * @category entry
 */

export {WComponent} from './core/w-component.mjs'
export {WController} from './core/w-controller.mjs'
export {start} from './core/start.mjs'
export {router} from './core/router.mjs'
export {universeBrickResolver} from './routing/universe-brick.mjs'
export {config} from './core/config.mjs'
export {itemStore, setItemStore} from './core/items.mjs'
export {MemoryAdapter} from './adapters/memory.mjs'
export {IndexedDBAdapter} from './adapters/indexeddb.mjs'
export {keyboard} from './core/keyboard.mjs'
export {runActions, runDoubleClickActions, isDisabled} from './core/actions.mjs'
export {css} from './core/css.mjs'
export {declareTasks, defer} from './core/microtasker.mjs'
export {schedule, cancel} from './core/scheduler.mjs'
export {loop} from './core/loop.mjs'
export {realClock, gameClock} from './core/clock.mjs'
export {$global} from './core/global.mjs'
export {quietEvents, addDebugSwitches, trace, addLog, countLeak, leakSnapshot, leakChanges} from './core/debug.mjs'
export {displayMode, chooseDisplayMode} from './core/display.mjs'
export {escapeHtml, unescapeHtml, setSanitizer, sanitizeHtml, createElementFromHTML, createSvgElementFromHTML, readClipboard, writeClipboard, svgToWidthHeight} from './utils/dom.mjs'
export {markdownToHtml} from './utils/markdown.mjs'
