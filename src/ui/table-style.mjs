// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto

/**
 * The look of the tables of an application: a class on `<table>`, `rc-table`, and classes that adjust it. The colours
 * come from the palette of the block (see the `theme` module): the table follows its palette, the day and the night.
 * Imported by `ui/all.mjs`.
 *
 * ```html
 * <table class="rc-table rc-table-grid rc-table-striped rc-table-select">
 *   <thead><tr><th>Time</th><th class="rc-right">Count</th></tr></thead>
 *   <tbody>
 *     <tr><td>09:37:26</td><td class="rc-right">12</td></tr>
 *     <tr class="selected"><td>09:37:30</td><td class="rc-right">7</td></tr>
 *   </tbody>
 * </table>
 * ```
 *
 * ## Look
 *
 * The table is compact: small text, low rows, a thin line between rows. The headers (`th`, at the top or on the left)
 * stand on a tinted band, in `--rc-text-strong`; the cells stand on `--rc-surface-raised`, in `--rc-text`. The links
 * of the cells are in `--rc-link`. The table takes the width of its block.
 *
 * | Class on `<table>` | Effect |
 * | --- | --- |
 * | `rc-table` | the look of the tables (required) |
 * | `rc-table-grid` | lines between the columns too |
 * | `rc-table-striped` | one row out of two is tinted: long rows are easier to follow |
 * | `rc-table-hover` | the row under the pointer is highlighted (only where the pointer can hover) |
 * | `rc-table-select` | the rows can be chosen: pointer, highlight under the pointer, and the chosen row (class `selected` or `aria-selected="true"` on `<tr>`) in `--rc-selected` |
 * | `rc-table-sticky` | the header row stays visible when the table scrolls in its block |
 *
 * | Class on a cell | Effect |
 * | --- | --- |
 * | `rc-left`, `rc-center`, `rc-right` | alignment of the text |
 * | `rc-num` | a number: aligned on the right, digits of equal width |
 * | `rc-muted` | secondary information, in `--rc-text-muted` |
 * | `rc-wrap` | a long text without spaces (an identifier, JSON) is cut anywhere instead of widening the table |
 * | `rc-nowrap` | the text stays on one line (a time, a code) |
 *
 * ## Corners
 *
 * The table has square corners. An application that puts it in a frame with rounded corners gives the radius with
 * `--rc-table-radius` (on the table or a parent): the corner cells of the last row follow it.
 *
 * @module table-style
 * @category ui
 */

import {css} from '../core/css.mjs'

css(`
table.rc-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  color: var(--rc-text);
  font-size: .85em;
  line-height: 1.3;
}
table.rc-table :is(th, td) {
  padding: .25em .5em;
  border: 0 solid var(--rc-border);
  text-align: left;
  vertical-align: top;
}
table.rc-table td { background: var(--rc-surface-raised); }
table.rc-table th {
  background: color-mix(in oklch, var(--rc-accent) 22%, var(--rc-surface-raised));
  color: var(--rc-text-strong);
  font-weight: 600;
  white-space: nowrap;
  vertical-align: middle;
}
table.rc-table tr + tr > :is(th, td), table.rc-table :is(tbody, tfoot) > tr:first-child > :is(th, td) { border-top-width: 1px; }
table.rc-table a { color: var(--rc-link); }
table.rc-table .rc-left { text-align: left; }
table.rc-table .rc-center { text-align: center; }
table.rc-table .rc-right { text-align: right; }
table.rc-table .rc-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
table.rc-table .rc-muted { color: var(--rc-text-muted); }
table.rc-table-grid :is(th, td) + :is(th, td) { border-left-width: 1px; }
table.rc-table-striped > tbody > tr:nth-child(even) > td { background: color-mix(in oklch, var(--rc-accent) 7%, var(--rc-surface-raised)); }
@media (hover: hover) {
  table:is(.rc-table-hover, .rc-table-select) > tbody > tr:hover > td { background: color-mix(in oklch, var(--rc-accent) 22%, var(--rc-surface-raised)); }
}
table.rc-table-select > tbody > tr { cursor: pointer; }
table.rc-table-select > tbody > tr:is(.selected, [aria-selected="true"]) > td {
  background: color-mix(in oklch, var(--rc-selected) 30%, var(--rc-surface-raised));
}
@media (hover: hover) {
  table.rc-table-select > tbody > tr:is(.selected, [aria-selected="true"]):hover > td {
    background: color-mix(in oklch, var(--rc-selected) 42%, var(--rc-surface-raised));
  }
}
table.rc-table-sticky > thead > tr > th { position: sticky; top: 0; z-index: 1; }
table.rc-table .rc-wrap { overflow-wrap: anywhere; }
table.rc-table .rc-nowrap { white-space: nowrap; }
table.rc-table > :last-child > tr:last-child > :first-child { border-bottom-left-radius: var(--rc-table-radius, 0); }
table.rc-table > :last-child > tr:last-child > :last-child { border-bottom-right-radius: var(--rc-table-radius, 0); }
`, {name: 'rc-table', layer: 'ricochet'})
