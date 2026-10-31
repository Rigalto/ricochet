# ricochet

Module `ricochet` · group `entry` · source [`src/ricochet.mjs`](../../src/ricochet.mjs)

The entry point of the kernel: the classes and functions an application uses, from one import, without knowing the
folders of Ricochet.

```javascript
import {WComponent, start, router} from 'ricochet/ricochet.mjs'
```

It loads the kernel only, not the components of the interface nor the icon set: those are in `ui/all.mjs`, which an
application imports once, at startup, when it uses them. Each module stays importable alone
(`ricochet/core/w-component.mjs`…), and its page of the [API reference](README.md) is the reference.

| Export | Module |
| --- | --- |
| `WComponent`, `WController` | [w-component](WComponent.md), [w-controller](WController.md) |
| `start` | [start](start.module.md) |
| `router` | [router](router.module.md) |
| `universeBrickResolver` | [universe-brick](universe-brick.module.md) |
| `config`, `itemStore`, `setItemStore` | [config](config.module.md), [items](items.module.md) |
| `MemoryAdapter` | [memory](memory.module.md) |
| `IndexedDBAdapter` | [indexeddb](indexeddb.module.md) |
| `secrets` | [secrets](secrets.module.md) |
| `session` | [session](session.module.md) |
| `keyboard` | [keyboard](keyboard.module.md) |
| `runActions`, `runDoubleClickActions`, `isDisabled` | [actions](actions.module.md) |
| `css` | [css](css.module.md) |
| `declareTasks`, `defer`, `schedule`, `cancel` | [microtasker](microtasker.module.md), [scheduler](scheduler.module.md) |
| `loop`, `realClock`, `gameClock` | [loop](loop.module.md), [clock](clock.module.md) |
| `displayMode`, `chooseDisplayMode` | [display](display.module.md) |
| `$global`, `quietEvents`, `addDebugSwitches`, `trace`, `addLog`, `countLeak`, `leakSnapshot`, `leakChanges` | [global](global.module.md), [debug](debug.module.md) |
| `escapeHtml`, `unescapeHtml`, `setSanitizer`, `sanitizeHtml`, `createElementFromHTML`, `createSvgElementFromHTML`, `loadScript`, `readClipboard`, `writeClipboard`, `svgToWidthHeight` | [dom](dom.module.md) |
| `markdownToHtml` | [markdown](markdown.module.md) |

The bus itself (`core/bus.mjs`) is not exported: components use `listen()` and `emit()`. The utilities (dates,
numbers, random numbers…) have their own entry point, [ricochet-utils](ricochet-utils.module.md).
