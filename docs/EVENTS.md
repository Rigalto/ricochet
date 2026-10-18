# Events used by Ricochet

Ricochet emits and listens to a few events on the bus. An application may listen to the **public** events and emit
those meant for it, with the payload described below; it must not use their names for anything else. The **internal**
events belong to the kernel.

**Reserved prefix:** event names starting with `rc` (`rcInterval`, `rcConfigSave`…) are reserved for the kernel. An
application never emits nor listens to them, and does not create names with this prefix.

## Public events

| Event | Emitted by | Listened by | Payload | Use |
| --- | --- | --- | --- | --- |
| `configLoaded` | `config` (`core/config.mjs`) | the application | `{}` | The configuration items are loaded for the first time: the application can start. |
| `configRefreshed` | `config` | the application | `{}` | The configuration items are loaded again (`config.load()` called a second time): caches built from them must be rebuilt. Every item observer is called too. |
| `dropdownOpen` | the application (a dropdown, a modal) | `keyboard` (`core/keyboard.mjs`) | `{}` | A modal opens: it takes the keyboard, with the keys given to `keyboard.setModalKeys()`. |
| `dropdownClose` | the application; `keyboard` when `Escape` is pressed in a modal | `keyboard`, the application | `{}` | The modal closes: its keys are forgotten. The modal listens to it to close itself when `Escape` is pressed. |
| `moduleFocus` | the application; `keyboard` when `Escape` is pressed in a module | `keyboard`, the application | `{module: string}` | A module takes the keyboard focus (`module: ''`: none). Its keys are those given to `keyboard.setModuleKeys()`. |
| `routeChanged` | `router` (`core/router.mjs`) | the application | the route: `{path, terms, scope, …}` | The route changed. The scope of the configuration items is already set, and the module of the route loaded. A component that listens to it also receives the current route at the end of the current task. |
| `routeLoading` | `router` | the application | `{path}` | The module of a route is loading: a view can show that it is busy. |
| `routeError` | `router` | the application | `{path, error}` | The resolver or the module of a route failed; the former route stays. |

## Internal events

| Event | Use |
| --- | --- |
| `rcInterval` | Internal use only, do not use it. |
| `rcConfigSave` | Internal use only, do not use it. |

## Events declared by the application

The other events that go through the kernel are the application's own: those named in `data-event` attributes, in the
`action` of keyboard keys, in `defer()` and `schedule()`. Ricochet only carries them.
