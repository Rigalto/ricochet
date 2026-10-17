# KeyboardController

Class `KeyboardController` · group `core` · source [`src/core/keyboard.mjs`](../../src/core/keyboard.mjs)

The keyboard controller. One instance, `keyboard`, serves the whole application.

## Methods

### keyupHandler(e)

Records the release of a key.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | KeyboardEvent | The `keyup` event. |

### keydownHandler(e)

Records a key press and hands it to the highest layer that listens for it.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | KeyboardEvent | The `keydown` event. |

### setAlertKeys(keys)

Keys of the alert shown; `null` when the alert closes. While an alert is shown, no other layer receives keys.

| Parameter | Type | Description |
| --- | --- | --- |
| `keys` | Array\|null | Array of `{key, action}`. |

### setModalKeys(keys)

Keys of the open modal.

| Parameter | Type | Description |
| --- | --- | --- |
| `keys` | Array\|null | Array of `{key, action}`. |

### setModuleKeys(module, keys, owner = null)

Keys of a module, used while it has the keyboard focus; `null` forgets them.

| Parameter | Type | Description |
| --- | --- | --- |
| `module` | string | Module name. |
| `keys` | Array\|null | Array of `{key, action}`. |
| `owner` | object | The component that declares them (see `release()`). |

### setFloatingKeys(group, keys)

Keys of a group of floating buttons. All groups are active together.

| Parameter | Type | Description |
| --- | --- | --- |
| `group` | string | Group name. |
| `keys` | Array | Array of `{key, action}`. |

### setViewKeys(keys, owner = null)

Keys of the current view; `null` forgets them.

| Parameter | Type | Description |
| --- | --- | --- |
| `keys` | Array\|null | Array of `{key, action}`. |
| `owner` | object | The component that declares them (see `release()`). |

### release(owner)

Forgets the module and view keys declared by a component, unless another component has replaced them since.
Called when a component is detached: a new view is often mounted before the former one is detached.

| Parameter | Type | Description |
| --- | --- | --- |
| `owner` | object | The component. |
