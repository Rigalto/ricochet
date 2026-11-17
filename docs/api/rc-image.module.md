# rc-image

Module `rc-image` · group `ui` · source [`src/ui/rc-image.mjs`](../../src/ui/rc-image.mjs)

An image that has no address the browser can load: a file of Google Drive read with a token, an image kept in
IndexedDB, a file dropped by the user and not yet sent. A named **source** gives the image of a reference, as a
`Blob` (or an address); the component shows it through a local address (`URL.createObjectURL()`), and frees that
address when no image uses it any more.

```js
import {defineImageSources} from 'ricochet/ui/rc-image.mjs'

defineImageSources({
  drive: {load: path => findFile(path).then(id => googleAccount.request(`${FILES}/${id}`, {query: {alt: 'media'}, answer: 'blob'}))}
})
```

```html
<rc-image source="drive" ref="kitchen/plan.png" alt="Plan of the kitchen" width="300"></rc-image>
```

With the `image` option of `markdownToHtml()` (see the `markdown` module), the relative images of a Markdown text
become `rc-image` elements.

## Sources

`defineImageSources({name: source})` declares sources; a source declared again replaces the former one. A source is
`{load: (ref, element) => …}`, or the function alone. It returns, or resolves to:

| Answer | Shown |
| --- | --- |
| a `Blob` (a `File`) | through a local address, freed when it is no longer used |
| a string | used as the address of the image (`https:`, `data:`, `blob:`…) |
| `null`, `undefined`, an error | no image: the `alt` text |

## Cache

The images of the same source and reference share one request and one local address. When no element shows an
image any more, its address is kept a while, among the last unused ones, so that a page shown again does not ask
for it again; the oldest are freed. `forgetImages(name, ref)` drops the images of a source (of one reference, when
given), when they changed: the elements that show them ask for them again.

## Look

The element is `inline-block`, holding an `<img>` no wider than its container. While the image loads, it has the
`loading` attribute (a light box of the requested size); when the image is missing, the `failed` attribute and the
`alt` text, in italics. `width` and `height` are pixels (`300`, `300px`) or, for `width`, a percentage of the
container (`50%`).

## Exports

| Name | Kind | Description |
| --- | --- | --- |
| `defineImageSources` | function | Declares named sources of images. |
| `forgetImages` | function | Drops the images of a source, or of one of its references: the elements that show them ask for them again. |
| `RcImage` | class | The component of `<rc-image>`. |

## Details

### defineImageSources()

Declares named sources of images.

| Parameter | Type | Description |
| --- | --- | --- |
| `definitions` | Object<string, object\|Function> | `{name: {load: (ref, element) => …}}`, or `{name: load}`. |

### forgetImages()

Drops the images of a source, or of one of its references: the elements that show them ask for them again.

| Parameter | Type | Description |
| --- | --- | --- |
| `name` | string | The source. |
| `ref` | string | The reference; all the references of the source when it is not given. |

### RcImage

The component of `<rc-image>`.
