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
| Highlight | `==highlighted==` |
| Underline | `++underlined++` |
| Code | `` `code` `` |
| Color | `` `#C04F21` `` (code followed by a swatch of the color; 3 or 6 hexadecimal digits) |
| Icon | `:save:` (an icon of the icon set) |
| Link | `[text](url)` |
| Image | `![alternative text](url)` |
| Image width | `![alternative text\|100](url)` (pixels), `![alternative text\|50%](url)` |
| Formula | `$$x^2$$` (kept as written, for a TeX renderer) |
| Literal character | `\*`, `` \` ``, `\[`, `\|`, `\\`, `\:`, `\=`, `\+`, `\$` … |

Bold may contain italic, code or a link, and a link text may contain bold or italic. Nothing is formatted inside code
or inside a formula.

## Extensions

These elements are not part of GitHub Flavored Markdown. Each one is written so that another reader still shows
something legible.

- **Highlight** `==text==` (Obsidian and many editors) and **underline** `++text++` (markdown-it). They are recognised
  only when the marker is not glued to a word or to the same character: `a==b`, `C++11`, `i++` stay as they are.
- **Icon** `:name:`, the convention of GitHub emoji: the name is lowercase letters only, and the colons are not glued
  to a word or to another colon (`10:30:00`, `a:b:c` stay as they are). The result is `<rc-icon icon="name"
  size="1.2em">`, sized like the text; the conversion does not check the name (the icon set is not loaded by it): an
  unknown name is drawn as `add` by `rc-icon`, which reports it once in the console. The page must load `rc-icon`
  (`ricochet/ui/all.mjs`).
- **Color** `` `#C04F21` ``: code containing only a color is followed by a round swatch, as on GitHub.
- **Image width**: `|100` (or `|100px`) or `|50%` at the end of the alternative text, as in Obsidian. Another reader
  shows it in the alternative text only.
- **Formula** `$$…$$`: the formula is kept exactly as written (its `\`, `*`, `_` are not Markdown), HTML escaped; the
  application renders it, with MathJax for instance. A formula that starts a line and is not closed on it continues
  until the line that closes it, and none of its lines is read as Markdown. GitHub reads `$$…$$` too.

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
| `##### `, `###### ` | `#### ` (four levels at most) |
| `* item` (level 1), `- item` (level 2) | `- item`, and `  - item` indented for level 2 |
| `+ item` | `1. item` |
| `* [X]`, `- [ ]` | `- [x]`, `- [ ]` |
| `!!italic!!` | `*italic*` |
| `__underlined__` | `++underlined++` |
| `==highlighted==` | unchanged |
| `::short quote::` | write « … » |
| `:::long quote` | `> long quote` |
| `[[br]]` | a line ending with `\` |
| `[[#path\|\|text]]`, `[[url\|\|text]]` | `[text](#path)`, `[text](url)` |
| `![[url\|\|alt]]`, `![[url\|\|alt\|\|100px]]` | `![alt](url)`, `![alt\|100](url)` |
| `![[name]]!` | `:name:` |
| `[[rect C04F21]]` | `` `#C04F21` `` |
| `###grid n` … `###/grid` | a table |
| `__Note__ :` | `> **Note:** …` |
