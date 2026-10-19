# rc-tabs

Module `rc-tabs` · group `ui` · source [`src/ui/rc-tabs.mjs`](../../src/ui/rc-tabs.mjs)

Tabs: `rc-tabs` holds `rc-tab` elements, each with the content of one tab. The tabs build the bar of their titles;
a click on a title shows its tab, then runs the actions of the `data-*` attributes of `rc-tabs` (see the `actions`
module), with the value of the tab in `data-value`.

```html
<rc-tabs data-item="sandbox-tab" value="map">
  <rc-tab value="map" label="Map" icon="map">…the map…</rc-tab>
  <rc-tab value="stats" label="Statistics" title="Counts of the last run">…the statistics…</rc-tab>
  <rc-tab value="log" label="Log" disabled>…</rc-tab>
</rc-tabs>
```

## Tabs

| Attribute of `rc-tab` | Role |
| --- | --- |
| `value` | value of the tab; default: its label |
| `label` | title in the bar |
| `icon` | icon before the title |
| `title` | tooltip of the title |
| `disabled` | the tab cannot be shown |

A tab added, removed, or whose attributes change, changes the bar. The content of the tabs stays in the page: a tab
that is not shown is hidden (`hidden`), and its components keep their state. A tab whose content is heavy may be
filled when it is first shown: the application listens to the event of `rc-tabs`.

## Value

The value is the `value` attribute of `rc-tabs`: the tab with that value is shown; when there is none, or it is
disabled, the first tab that is not disabled. The `value` property of the component (`element._component.value`)
reads and writes it. Changing the value by the attribute or by `value` runs no action; a click on the title of the tab
already shown runs nothing.

| Use | How |
| --- | --- |
| A configuration item | `data-item="name"` on `rc-tabs`: the tab shown is kept in the item, and follows it. |
| An event | `data-event="name"` on `rc-tabs`, with `data-param`: emitted with `value` added to the payload. |

## Look

The titles are flat buttons on a line; the title of the tab shown is underlined in `--rc-selected`. The palette of
the tabs is the palette of their block: `rc-tabs` may have its own `palette`, and a tab may be an `rc-panel`.

## Keyboard and screen readers

The bar has `role="tablist"`, each title is a `<button role="tab">` with `aria-selected`, each tab has
`role="tabpanel"`. `Tab` reaches the title of the tab shown, then its content; `←` and `→` show the previous or the
next tab, `Home` and `End` the first or the last one, skipping the disabled ones.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `RcTab` | class | The component of `<rc-tab>`: the content of one tab. Its attributes are read by `rc-tabs`. |
| `RcTabs` | class | The component of `<rc-tabs>`. |

## Details

### RcTab

The component of `<rc-tab>`: the content of one tab. Its attributes are read by `rc-tabs`.

### RcTabs

The component of `<rc-tabs>`.
