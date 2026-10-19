# button-style

Module `button-style` · group `ui` · source [`src/ui/button-style.mjs`](../../src/ui/button-style.mjs)

The look shared by the components that hold a `<button>`: `rc-icon-button`, `rc-text-button`, and `rc-checkbox` and
`rc-radio`, which look like flat buttons. Imported by these components; an application does not import it.

| Attribute | Look |
| --- | --- |
| (none) | the button stands on the surface of its block (`--rc-surface-raised`), with a light border |
| `flat` | no background nor border: a toolbar, a breadcrumb |
| `link` | `rc-text-button` only: a link, in `--rc-link`, underlined with dots |
| `palette`, `shade` | the button takes the surface of that palette or shade: an action that stands out |

Every look has the hover and pressed states of the palette (`--rc-accent`, `--rc-accent-active`), the focus ring
`--rc-focus` with the keyboard, and the disabled tokens. Shadows come from the classes of the `theme` module
(`rc-shadow-2`, `rc-text-shadow`…).
