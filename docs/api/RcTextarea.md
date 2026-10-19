# RcTextarea

Class `RcTextarea` extends [`RcInput`](RcInput.md) · element `<rc-textarea>` · group `ui` · source [`src/ui/rc-textarea.mjs`](../../src/ui/rc-textarea.mjs)

The component of `<rc-textarea>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `rows` | in | `number` = `2` | Lines shown at least. |
| attribute | `max-rows` | in | `number` | Lines shown at most; beyond, the field scrolls. |

## Methods

### isCommitKey(e)

`Ctrl` + `Enter` (`⌘` + `Enter`) commits; `Enter` alone starts a new line.

| Parameter | Type | Description |
| --- | --- | --- |
| `e` | KeyboardEvent | The `keydown` event. |

**Returns** `boolean` True if the key commits.

### fieldUpdated()

The height follows the text (browsers without `field-sizing`).
