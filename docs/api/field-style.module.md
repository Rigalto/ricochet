# field-style

Module `field-style` · group `ui` · source [`src/ui/field-style.mjs`](../../src/ui/field-style.mjs)

The look shared by the fields: `rc-input`, `rc-textarea` and `rc-select`. Imported by these components; an
application does not import it.

The field stands on the surface of its block (`--rc-surface-raised`), with the border `--rc-border`; the hover
mixes `--rc-accent` into the border; the focus shows `--rc-focus`; an invalid field (attribute `invalid`) shows
`--rc-danger`; the placeholder is in `--rc-text-faint`; a disabled field uses the disabled tokens. The field takes
the width of its element, set by the application.
