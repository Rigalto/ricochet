# css

Module `css` · group `core` · source [`src/core/css.mjs`](../../src/core/css.mjs)

Styles written next to the component that uses them.

`css(rules)` is called once, when the module of a component is loaded. It adds one `<style>` element at the end of
`<head>`, at once: the rules apply before the component is mounted, so it is never shown without its styles. The
browser recalculates styles once before the next frame, however many `<style>` elements were added.

- **One block per call.** A syntax error, such as a missing `}`, only breaks the rules of its own block. Unbalanced
  braces are reported in the console, with the name of the block.
- **A name for each block.** The `data-css` attribute of the `<style>` element holds the first selector of the
  rules (`[as="game-aliens"]`), or the name given in the options: the inspector shows where each rule comes from.
- **Layers.** The components of Ricochet put their rules in the `ricochet` cascade layer. Rules outside any layer,
  which is the default for an application, always win over rules in a layer, whatever their specificity and their
  order: an application overrides the look of a kernel component without fighting its selectors.

```javascript
import {css} from 'ricochet/core/css.mjs'

css(`
[as="like-counter"] { font-weight: bold; }
`)
```

Editors highlight the CSS of the template when it is preceded by a comment holding the word `css`, as in the
components of Ricochet.

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `balancedBraces` | function | Checks that the braces of CSS rules are balanced, ignoring comments and strings. |
| `css` | function | Adds CSS rules to the page, at once, in a `<style>` element of their own. |

## Details

### balancedBraces()

Checks that the braces of CSS rules are balanced, ignoring comments and strings.

| Parameter | Type | Description |
| --- | --- | --- |
| `rules` | string | CSS rules. |

**Returns** `boolean` `true` when every `{` is closed, and no `}` comes before its `{`.

### css()

Adds CSS rules to the page, at once, in a `<style>` element of their own.

| Parameter | Type | Description |
| --- | --- | --- |
| `rules` | string | Complete CSS rules, with their selectors and braces. |
| `options` | {name: string, layer: string} | `name` of the block (default: the first selector); cascade `layer` that holds the rules (default: none). |

**Returns** `HTMLStyleElement|null` The `<style>` element, or `null` outside a browser.
