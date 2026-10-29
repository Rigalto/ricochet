# Using Ricochet

This guide explains how to set up an application on top of Ricochet: getting the files, loading them, starting the
application, running it on your computer, a phone version, and documenting your own code. The look of the interface
(palettes, day and night) has a guide of its own, [THEME.md](THEME.md), and so has debugging, [DEBUG.md](DEBUG.md).

## 1. Get the kernel

Ricochet is a set of plain JavaScript modules: there is nothing to install and nothing to build. It lives **in your
project**: your application carries its own copy of the `src/` folder and serves it with its own files.

This is a choice, and it brings a lot for a small cost (about 450 kB of code, plus 1.3 MB for the icon set, loaded only
with the interface):

- **You decide when to update.** The version you have tested is the one your users run; a change to the kernel
  reaches your application only when you take it.
- **Nothing depends on a third party.** No CDN that could be slow, blocked or gone: if your site is up, Ricochet is up.
- **Everything works offline**, on your computer as on the server, with the same paths.
- **One origin.** The kernel comes from the same place as your pages: no cross-origin request, nothing to declare,
  the cache of the browser works as for your own files.
- **You can read it and change it.** The code you run is in your project, next to yours.

Choose one of these ways:

| Way | How | When |
| --- | --- | --- |
| Git submodule | `git submodule add https://github.com/Rigalto/ricochet.git ricochet`, then `git submodule update --remote` to follow updates | Your application is in a Git repository and you want to follow Ricochet's updates. Recommended. |
| Copy | Download the repository and copy its `src/` folder into your project | Your application will keep the version it was built with. |

> **The site of Ricochet (`rigalto.github.io/ricochet`) is for its demos and its documentation.** It always shows the
> latest code, as it is being written: load the kernel from your own copy, never from there.

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

Then, in your code, import from the entry points of Ricochet:

```js
import {WComponent, start, markdownToHtml} from 'ricochet/ricochet.mjs' // the kernel
import {setTheme, showConfirm} from 'ricochet/ui/all.mjs'               // every component of the interface
import {today, formatDate, debounce} from 'ricochet/ricochet-utils.mjs' // the utilities, if you want them
```

- **`ricochet/ricochet.mjs`** gives the classes and functions of the kernel, without loading the interface: an
  application without `rc-*` components, or a test, loads only what it needs.
- **`ricochet/ui/all.mjs`** loads every component of the interface, the theme and the icon set, and gives their
  functions. Import it once, at startup, before `start()`: every `rc-*` tag is then defined before the interface is
  mounted.
- **`ricochet/ricochet-utils.mjs`** gives the utilities: calendar dates, texts, numbers, random numbers and noise,
  complex numbers, hashes, unique identifiers, `debounce` and `throttle`. They are optional: use them, or the library
  of your choice.

Each module can also be imported alone (`ricochet/ui/rc-select.mjs`, `ricochet/utils/markdown.mjs`…): the
[API reference](api/README.md) is organised by module, and the pages of the entry points list where each export
comes from.

> **A tag whose module is not imported** stays an unknown element: the browser shows its content as it is, without
> any error. Ricochet reports it in the console when a content is mounted (`WComponent: <rc-select> not defined…`),
> once per tag, with the component that holds it. While you develop, `$global.debug.strict = true` turns the report
> into an error that stops the code.

Since Ricochet travels with your application, the import map is the same on your computer and on your server: the
application and its copy of the kernel move together. If you put the folder somewhere else, only the import map
changes.

> **Load each module from one URL only.** A module imported through two different URLs is run twice: for the kernel,
> that would mean two event buses and two keyboard controllers.

## 3. Start the application

An application is a page, a few components, and a call to `start()`. Here is a complete one: a header with the choice
of the theme, two pages reached by their address (`#home`, `#about`), and a setting kept in a configuration item.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My application</title>
  <script type="importmap">{"imports": {"ricochet/": "./ricochet/src/"}}</script>
</head>
<body>
  <header palette="header">
    <rc-text-button flat data-path="#home">Home</rc-text-button>
    <rc-text-button flat data-path="#about">About</rc-text-button>
    <rc-select data-item="ricochet-theme" options="System#system|Day#day|Night#night" label="Theme"></rc-select>
  </header>
  <app-page palette="view"></app-page>
  <script type="module">
    import {start, MemoryAdapter} from 'ricochet/ricochet.mjs'
    import 'ricochet/ui/all.mjs'
    import './app-page.mjs'

    await start({
      storage: new MemoryAdapter({'ricochet-theme': 'system'}), // IndexedDBAdapter, HTTP or Drive in a real application
      router: ({path}) => ['home', 'about'].includes(path) ? {path, page: path} : {redirect: 'home'},
    })
  </script>
</body>
</html>
```

```javascript
// app-page.mjs
import {WComponent} from 'ricochet/ricochet.mjs'

const PAGES = {
  home: '<h1>Home</h1><rc-checkbox data-item="app-compact">Compact view</rc-checkbox>',
  about: '<h1>About</h1><p>Built with Ricochet.</p>',
}

class AppPage extends WComponent {
  attach () {
    this.listen('routeChanged') // the current route at once, then each change of the address
    this.observeItems(['app-compact'])
  }

  routeChangedDispatched (route) { this.innerHTML(PAGES[route.page]) }

  itemsChanged (items) { this.element.classList.toggle('compact', items['app-compact'] === 'yes') }
}
WComponent.define('app-page', AppPage)
```

`start()` loads the configuration items, resolves the current address (here `#home` when the address is empty or
unknown), then mounts the page: the components of the page see the items and the route from their first `attach()`.
No component calls another one: the buttons change the address or an item, and the components that care listen.

The components of the interface (`<rc-text-button>`, `<rc-select>`, `<rc-checkbox>`) are defined by
`ricochet/ui/all.mjs`, imported once by the page. The demos, `demo/components.html`, `demo/floating.html` and
`demo/theme.html`, show each component at work.

## 4. Run the application on your computer

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

To see what the application does (the events, the changes of the items, the errors, the leaks), see the guide of
debugging, [DEBUG.md](DEBUG.md).

## 5. A phone and a computer

Ricochet does not make a responsive layout: an application has two versions of its interface, one for a computer and
one for a phone, and adapts each one with CSS and with code. The display mode is chosen once, when the application
starts (see the `display` module): `phone` when the shorter side of the screen is below 600 pixels, `pc` otherwise.
Resizing the window does not change it.

```css
[display-mode="phone"] rc-floating-bar { gap: 12px; }
```

```javascript
import {displayMode} from 'ricochet/ricochet.mjs'

attach () {
  // on a phone, one button opens a dialog with the six tools; on a computer, the six tools are shown
  this.innerHTML(displayMode === 'phone' ? toolsButton : tools)
}
```

To work on the phone version from a computer, set the configuration item `ricochet-display` to `phone` and load the
page again (`auto` comes back to the choice by the screen), or use the device mode of the developer tools of the
browser and load the page again.

## 6. Display HTML of external origin

Ricochet never interprets HTML coming from data: Markdown is converted by `markdownToHtml()`, which escapes every
character before adding its own tags. When your application must display HTML or SVG coming from elsewhere (a stored
document, a pasted image), register a sanitizer once, at startup. Ricochet does not ship one, so that it keeps no
dependency; [DOMPurify](https://github.com/cure53/DOMPurify) is a common choice:

```js
import {setSanitizer} from 'ricochet/utils/dom.mjs'

setSanitizer(html => DOMPurify.sanitize(html))
```

Without a registered sanitizer, `sanitizeHtml()` shows the HTML as text and reports it in the console.

## 7. Keep an API key out of the code

A key of a web service (weather, air quality, maps) must not be written in the code: the repository is public, and the
pages are served as they are. Let the user give it, once, in a field of the interface, and keep it with `secrets`: in
the local storage of this browser, never sent to the storage adapter nor written to the logs.

```js
import {WComponent, secrets} from 'ricochet/ricochet.mjs'

class AirQuality extends WComponent {
  attach () {
    this.listen('secretChanged') // the key given or removed, here or in another tab
    this.refresh()
  }

  secretChangedDispatched ({name}) { if (name === 'aqicn') { this.refresh() } }

  refresh () {
    const token = secrets.get('aqicn') // synchronous; null while the user has not given it
    if (token === null) { /* show how to get a key, and the field to give it */ return }
    // fetch(`https://api.waqi.info/feed/paris/?token=${token}`)…
  }
}
```

The field calls `secrets.set('aqicn', value)`; an empty value removes the key. The key is kept for this browser on
this computer: in another browser or on another computer, the user gives it again, so the field tells where to get
it. The local storage is shared by every page of the same origin (all the applications of a GitHub Pages account):
fine for your own applications, but it is not a safe.

## 8. Document your own code

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

## 9. Publish the application

Once Ricochet is in your application (step 1), the application is a set of static files, the kernel included: any
static host works, GitHub Pages included, and publishing the application publishes its kernel with it. With GitHub Pages, add an empty `.nojekyll` file at the root of your repository; without it,
files and folders whose name starts with `_` are not published.
