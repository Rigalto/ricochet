# RcDropdown

Class `RcDropdown` extends [`WComponent`](WComponent.md) · element `<rc-dropdown>` · group `ui` · source [`src/ui/rc-dropdown.mjs`](../../src/ui/rc-dropdown.mjs)

The component of `<rc-dropdown>`.

## Interface

| Kind | Name | Direction | Payload | Description |
| --- | --- | --- | --- | --- |
| attribute | `icon` | in | `string` | Icon of the button; without it, the button is a text button. |
| attribute | `label` | in | `string` | Text of the button; default: none. |
| attribute | `no-label` | in | `boolean` | No text on the button. |
| attribute | `size` | in | `number` | Size of the icon. |
| attribute | `flat` | in | `boolean` | The button has no background. |
| attribute | `title` | in | `string` | Tooltip of the button. |
| attribute | `content` | in | `string` | Tag of a component created in the window at each opening. |
| attribute | `content-attr` | in | `string` | Attributes of that component, as written in HTML. |
| event | `dropdownClose` | in | `{id: string}` | Closes the window: every dropdown, or the one with this `id`. |

## Methods

### get open

Whether the window is open.

### dropdownCloseDispatched(payload)

The event `dropdownClose`: closes the window, unless it names another dropdown.

| Parameter | Type | Description |
| --- | --- | --- |
| `payload` | {id: string} | `id` of the dropdown to close; none: every dropdown. |

### show()

Opens the window.

### close()

Closes the window.
