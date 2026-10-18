# Using Ricochet

This guide explains how to set up an application on top of Ricochet: getting the files, loading them, running the
application on your computer, and documenting your own code.

> **Status:** the kernel is being moved into this repository file by file. The sections below describe what is
> available today; a complete minimal application will be added once the core classes (`WComponent`, `WController`)
> are here.

## 1. Get the kernel

Ricochet is a set of plain JavaScript modules: there is nothing to install and nothing to build. Your application
needs a copy of the `src/` folder. Choose one of these ways:

| Way | How | When |
| --- | --- | --- |
| Git submodule | `git submodule add https://github.com/Rigalto/ricochet.git ricochet`, then `git submodule update --remote` to follow updates | Your application is in a Git repository and you want to follow Ricochet's updates. Recommended. |
| Copy | Download the repository and copy its `src/` folder into your project | Your application will keep the version it was built with. |
| CDN | Load the files from jsDelivr, pinned to a release tag: `https://cdn.jsdelivr.net/gh/Rigalto/ricochet@<tag>/src/` | You want to try Ricochet without copying anything. |

> **Do not load Ricochet from its GitHub Pages site** (`rigalto.github.io/ricochet`). That site always serves the
> latest, unreleased code: a change made to the kernel would reach your application without warning. Pages is not a
> CDN either: it is not meant to serve the files of many applications.

The files that come with the repository (`.gitattributes`, `.nojekyll`, `.githooks/`) are only used to maintain
Ricochet itself. Your application does not need them.

Ricochet is released under the [MIT license](../LICENSE). Each file starts with two lines that name the license and
the author:

```javascript
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Rigalto
```

Keep them when you copy a file, even a single one: they are what the license asks for. Your own files need no such
header.

## 2. Load it with an import map

Ricochet's modules import each other with relative paths, so the `src/` folder can live anywhere. Your application
refers to it through a short prefix, `ricochet/`, declared once in an import map. The import map must come **before**
the first `<script type="module">` of the page:

```html
<script type="importmap">
{
  "imports": {
    "ricochet/": "./ricochet/src/"
  }
}
</script>
<script type="module" src="./app.mjs"></script>
```

Then, in your code:

```js
import {markdownToHtml} from 'ricochet/utils/markdown.mjs'
import {iconset} from 'ricochet/icons/iconset.mjs'
```

To change where Ricochet comes from (a local copy while developing, a CDN in production), only the import map changes.
It can be written by a small script when the place depends on where the page runs:

```html
<script>
  const local = ['localhost', '127.0.0.1'].includes(location.hostname)
  const importMap = document.createElement('script')
  importMap.type = 'importmap'
  importMap.textContent = JSON.stringify({
    imports: {'ricochet/': local ? '/ricochet/src/' : 'https://cdn.jsdelivr.net/gh/Rigalto/ricochet@<tag>/src/'},
  })
  document.currentScript.after(importMap)
</script>
```

> **Load each module from one URL only.** A module imported through two different URLs is run twice: for the kernel,
> that would mean two event buses and two keyboard controllers.

## 3. Run the application on your computer

Browsers refuse to load modules from `file://` addresses. Open the application through a local web server instead,
for instance one of these, started from the application folder:

- `npx http-server` (Node.js);
- `python3 -m http.server` (Python);
- the *Live Server* extension of VSCode.

Then open `http://localhost:<port>`.

If your application also calls an API on a remote server, the browser blocks those calls from `localhost` (CORS),
and cookies of the remote server are not sent. The usual answer is a small development server, kept in your
application, that serves your files from the disk and relays the API calls to the remote server: for the browser,
everything then comes from `localhost`. Node.js can do this in about a hundred lines, with no dependency.

## 4. Display HTML of external origin

Ricochet never interprets HTML coming from data: Markdown is converted by `markdownToHtml()`, which escapes every
character before adding its own tags. When your application must display HTML or SVG coming from elsewhere (a stored
document, a pasted image), register a sanitizer once, at startup. Ricochet does not ship one, so that it keeps no
dependency; [DOMPurify](https://github.com/cure53/DOMPurify) is a common choice:

```js
import {setSanitizer} from 'ricochet/utils/dom.mjs'

setSanitizer(html => DOMPurify.sanitize(html))
```

Without a registered sanitizer, `sanitizeHtml()` shows the HTML as text and reports it in the console.

## 5. Document your own code

The documentation of Ricochet is generated from the `/** … */` blocks of its source files by `tools/doc.mjs`. The
same blocks feed three readers: the tooltips of VSCode, the Markdown pages of `docs/api/` that GitHub displays, and
your application, which can read `docs/api/index.json` and show the pages with `markdownToHtml()`. Each entry of
the index gives the name (`n`), the kind (`k`: `c` class, `m` module), the parent class (`e`), the group (`g`), the
source file (`s`) and the page (`p`): `<Class>.md` for a class, `<module>.module.md` for a module, so that a class
and a module whose names differ only by case (`Scheduler`, `scheduler`) do not share a file on Windows or macOS.

Your application can use the same tool for its own components. From the application folder:

```sh
node ricochet/tools/doc.mjs components
```

where `components` is the folder of your sources (several folders may be given). The pages are written in
`docs/api/` of your application.

A class is documented by the block right above it; a module by a block holding a `@module` tag, usually at the top
of the file. The text of the block is [Ricochet Markdown](MARKDOWN.md). The class name, its parent class, the tag of
its element and the list of exports are read from the code, so they never go out of date. The tags:

| Tag | Use |
| --- | --- |
| `@module name` | The block documents the whole file. |
| `@category name` | Group in the index (default: the first folder under the source folder). |
| `@element tag` | Element tag, when it is not found in a `define()` call. |
| `@property {type} name - text` | A JavaScript property. |
| `@css name - text` | A CSS class set or used by the component. |
| `@param {type} [name=default] - text` / `@returns {type} text` | For methods and exported functions. |
| `@example` | Code shown as an example (the following lines). |
| `@deprecated text`, `@see text` | Notes. |

The stimuli a component receives or emits are gathered in one **Interface** table, sorted by kind, then by direction
(`in`, `in/out`, `out`). Each kind has its own tag:

| Kind | Tag | Default direction | Between braces |
| --- | --- | --- | --- |
| attribute | `@attr {type} [name=default] - text` | in | type of the value |
| event | `@listens {payload} name - text` / `@fires {payload} name - text` | in / out | type of the detail |
| window | `@listens window:name - text` | in | type of the event |
| item | `@item {in\|out\|in/out} name - text` | — | direction |
| key | `@key name - text` | in | — |
| data | `@data {in\|out\|in/out} name - text` | — | direction |
| action | `@action data-xxx - text` | out | — |

The direction may also be written after the name, for instance an attribute written by the component itself:
`@attr {string} data-value (out) - Selected value.` For an event, the payload may be an object type:
`@fires {{selected: string}} tableRowSelected - A row was clicked.`

Methods and exports are listed when they have a block of their own; a one-line block (`/** Text. */`) is enough.

To regenerate the documentation at every commit, add a Git hook to your application, in `.githooks/pre-commit`:

```sh
#!/bin/sh
node ricochet/tools/doc.mjs components || exit 1
git add docs/api
```

and enable it once per clone with `git config core.hooksPath .githooks`. On macOS and Linux, the hook must be
executable: `chmod +x .githooks/pre-commit`.

## 6. Publish the application

Once Ricochet is in your application (step 1), the application is a set of static files: any static host works,
GitHub Pages included. With GitHub Pages, add an empty `.nojekyll` file at the root of your repository; without it,
files and folders whose name starts with `_` are not published.
