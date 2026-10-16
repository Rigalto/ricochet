# Ricochet Markdown

Ricochet uses a **restricted Markdown**: a subset of [GitHub Flavored Markdown](https://github.github.com/gfm/) that
any Markdown reader (GitHub, VSCode, Obsidian…) displays correctly, and that Ricochet converts to HTML in a single pass
with regular expressions (`src/utils/markdown.mjs`).

The rule of thumb: **if it is not in this page, do not use it.** Anything else is shown as plain text.

## Blocks

A block is recognised by the start of its line. Blocks are separated by a blank line.

| Block | Syntax | Notes |
| --- | --- | --- |
| Heading | `# Title` … `#### Title` | Levels 1 to 4. |
| Paragraph | plain lines | Consecutive lines are joined into one paragraph. |
| Line break | a line ending with `\` | Use rarely; prefer a new paragraph or a list. |
| Bullet list | `- item` | `*` is accepted too. |
| Numbered list | `1. item` | The first number sets the start; the others are ignored. |
| Task list | `- [ ] todo`, `- [x] done` | Inside a bullet list. |
| Nested list | indent the marker by 2 spaces | Two levels at most. |
| Quote / note | `> text` | Every line of the block starts with `>`. |
| Code block | ```` ``` ```` … ```` ``` ```` | An optional language name may follow the opening fence. |
| Table | `\| a \| b \|` then `\| --- \| --- \|` | The second line is required; `:---`, `:---:`, `---:` set the alignment. |
| Separator | `---` | Must follow a blank line (otherwise it would turn the line above into a heading). |

A list item may continue on the next lines if they are indented by 2 spaces. A blank line between two items does not
end the list (a numbered list keeps counting); any other line after a blank line does.

## Inline

| Element | Syntax |
| --- | --- |
| Bold | `**bold**` |
| Italic | `*italic*` |
| Strikethrough | `~~struck~~` |
| Code | `` `code` `` |
| Link | `[text](url)` |
| Image | `![alternative text](url)` |
| Literal character | `\*`, `` \` ``, `\[`, `\|`, `\\` … |

Bold may contain italic, code or a link, and a link text may contain bold or italic. Nothing is formatted inside code.

## Rules that keep the conversion simple

- No raw HTML: `<` and `>` are always displayed as such.
- Emphasis uses `*` only, never `_`: identifiers such as `table_sort` or `table-sort-$-field` stay untouched.
- No reference links (`[text][ref]`), no automatic links (`<https://…>`), no setext headings (title underlined with
  `===`).
- A `|` inside a table cell must be written `\|`, even inside code.
- Only `http:`, `https:`, `mailto:`, relative paths and `#…` links are kept. Any other scheme (such as `javascript:`)
  is shown as text.

## Application links

A link whose target starts with `#` is an **application link**: `[Recipes](#cooking/rec/123)`. Other Markdown readers
show it as an ordinary link. The application decides what it means through the `link` option of `markdownToHtml()`
(see `src/utils/markdown.mjs`), for instance to navigate to a universe, a brick or a card.

## Differences from the former SweetHome syntax

| Former syntax | Restricted Markdown |
| --- | --- |
| `<br>` to separate lines | a blank line (new paragraph) or a list |
| `* item` (level 1), `- item` (level 2) | `- item`, and `  - item` indented for level 2 |
| `!!italic!!` | `*italic*` |
| `__underlined__`, `==highlighted==` | not supported (no standard Markdown equivalent) |
| `[[br]]` | a line ending with `\` |
| `__Note__ :` | `> **Note:** …` |
