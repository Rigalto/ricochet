# table-style

Module `table-style` · group `ui` · source [`src/ui/table-style.mjs`](../../src/ui/table-style.mjs)

The look of the tables of an application: a class on `<table>`, `rc-table`, and classes that adjust it. The colours
come from the palette of the block (see the `theme` module): the table follows its palette, the day and the night.
Imported by `ui/all.mjs`.

```html
<table class="rc-table rc-table-grid rc-table-striped rc-table-select">
  <thead><tr><th>Time</th><th class="rc-right">Count</th></tr></thead>
  <tbody>
    <tr><td>09:37:26</td><td class="rc-right">12</td></tr>
    <tr class="selected"><td>09:37:30</td><td class="rc-right">7</td></tr>
  </tbody>
</table>
```

## Look

The table is compact: small text, low rows, a thin line between rows. The headers (`th`, at the top or on the left)
stand on a tinted band, in `--rc-text-strong`; the cells stand on `--rc-surface-raised`, in `--rc-text`. The links
of the cells are in `--rc-link`. The table takes the width of its block.

| Class on `<table>` | Effect |
| --- | --- |
| `rc-table` | the look of the tables (required) |
| `rc-table-grid` | lines between the columns too |
| `rc-table-striped` | one row out of two is tinted: long rows are easier to follow |
| `rc-table-hover` | the row under the pointer is highlighted (only where the pointer can hover) |
| `rc-table-select` | the rows can be chosen: pointer, highlight under the pointer, and the chosen row (class `selected` or `aria-selected="true"` on `<tr>`) in `--rc-selected` |
| `rc-table-sticky` | the header row stays visible when the table scrolls in its block |

| Class on a cell | Effect |
| --- | --- |
| `rc-left`, `rc-center`, `rc-right` | alignment of the text |
| `rc-num` | a number: aligned on the right, digits of equal width |
| `rc-muted` | secondary information, in `--rc-text-muted` |
| `rc-wrap` | a long text without spaces (an identifier, JSON) is cut anywhere instead of widening the table |
| `rc-nowrap` | the text stays on one line (a time, a code) |

## Corners

The table has square corners. An application that puts it in a frame with rounded corners gives the radius with
`--rc-table-radius` (on the table or a parent): the corner cells of the last row follow it.
