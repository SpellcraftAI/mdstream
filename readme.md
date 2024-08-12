# Streaming *Markdown*

[![version](https://img.shields.io/npm/v/streaming-markdown?logo=npm)](https://www.npmjs.com/package/streaming-markdown) [![github](https://img.shields.io/badge/GitHub-streaming--markdown-orange?logo=github)](https://github.com/thetarnav/streaming-markdown)

**Experiment making a streaming markdown parser *à la ChatGPT*.**

## INTERNAL FORK

*Original:* https://github.com/thetarnav/streaming-markdown

*Original author and all parsing logic*: @thetarnav

---

## Installation

Install `streaming-markdown` package from npm.

```bash
npm install streaming-markdown
```

Or use the [CDN link](https://www.jsdelivr.com/package/npm/mdstream). The
`browser` export is a minified **(2.5kB gzipped)** version of the package, with only
the parser methods and and DOM renderer exported.

```html
<script type="module">
    import { parse, finish, createParser, createDOMRenderer } from "https://cdn.jsdelivr.net/npm/mdstream/dist/browser.js"
    // ...
</script>
```

The package uses ES module exports, so you need to use `type="module"` in your
script tag. See usage below.

## Usage

First create new markdown `Parser` by calling `parser` function. It's single
argument is a `Renderer` object, which is an interface to render the parsed
markdown tokens to the DOM. The built-in renderers are:

- `DOMRenderer`, which renders by appending to the DOM from a browser client
  script;
- `HTMLRenderer`, which renders to raw HTML;
- `ANSIRenderer`, which renders to ANSI-styled text using `chalk`; and
- `LogRenderer`, which prints the internal parser methods as they're called.

```js
import { parse, finish, createParser, DOMRenderer } as smd from "mdstream"

const element  = document.getElementById("markdown")
const renderer = createDOMRenderer(element)
const parser   = createParser(renderer)
```

### `parse` function

Then, you can start streaming markdown to the `Parser` by calling `parse()`
function with the chunk of markdown string.

```js
parse(parser, "# Streaming Markdown\n\n")
```

*You can write **as many times as you want** to stream the markdown.*

The parser is optimistic. When it sees the start of an inline code block or code
block, it will immediately style the element accordingly.

E.g. `` `print("hello wor `` should be rendered as `<code>print("hello
wor</code>`

While the text is streamed in, the user should be able to select the text that
has already been streamed in and copy it.

*(The parser is only adding new elements to the DOM, not modifying the existing
ones.)*

### `finish` function

Finally, you can end the stream by calling `finish()` function.

It will reset the `Parser` state and flush the remaining markdown.

```js
finish(parser)
```

## Working with `ReadableStream<Uint8Array>`

To transform a `ReadableStream`, use `MarkdownStream` to create a
`TransformStream<Uint8Array, Uint8Array>`. The built-in renderers come with
renderer transforms already (except the DOM renderer, which manipulates the DOM
at runtime):

- `MarkdownHTMLStream`
- `MarkdownANSIStream`
- `MarkdownLogStream`

### Parsing to HTML

```ts
const readme = Bun.file("readme.md")
const response = new Response(
  readme.stream().pipeThrough(new MarkdownHTMLStream())
)
```

### Extending

`MarkdownStream` can wrap any renderer, for instance `MarkdownLogStream` creates
the parser and returns it for its parent to use:

```ts
export class MarkdownLogStream extends MarkdownStream {
  constructor() {
    const ENCODER = new TextEncoder()
    
    super({
      start: (controller) => {
        const renderer = createLogRenderer({
          render: (chunk) => controller.enqueue(ENCODER.encode(chunk)),
        })

        return createParser(renderer)
      }
    })
  }
}
```

## Examples

### Render to DOM with `DOMRenderer`

Displaying this README as a demo with delayed chunks:

```html
<script type="module">
  import { parse, finish, createParser, createDOMRenderer } from "mdstream"

  const response = await fetch("readme.md")
  const source = await response.text()

  const container = document.getElementById("markdown")
  const renderer = createDOMRenderer(container)
  const parser = createParser(renderer)

  let i = 0
  while (i < source.length) {
    const length = Math.floor(Math.random() * 20) + 1
    const delay = Math.floor(Math.random() * 80) + 10
    const chunk = source.slice(i, i += length)

    await new Promise(resolve => setTimeout(resolve, delay))
    parse(parser, chunk)
  }

  finish(parser)
</script>
```

## Markdown features

- [x] Paragraphs
- [x] Line breaks
    - [x] don't end tokens
    - [x] Escaping line breaks
- [x] Trim unnecessary spaces
- [x] Headers
    - [ ] ~~Alternate syntax~~ *(not planned)*
- [x] Code Block with indent
- [x] Code Block with triple backticks
    - [x] language attr
    - [x] with many backticks
- [x] `` `inline code` `` with backticks
    - [x] with many backticks
    - [x] trim spaces ` code `
- [x] *italic* with single asterisks
- [x] **Bold** with double asterisks
- [x] _italic_ with underscores
- [x] __Bold__ with double underscores
- [x] Special cases:
    - [x] **bold*bold>em***
    - [x] ***bold>em*bold**
    - [x] *em**em>bold***
    - [x] ***bold>em**em*
- [x] \* or \_ cannot be surrounded by spaces
- [x] Strikethrough ~~example~~
- [x] Escape characters (e.g. \* or \_ with \\\* or \\\_)
- [x] \[Link\](url)
    - [x] `href` attr
- [ ] Raw URLs
    - [ ] http://example.com
    - [ ] https://example.com
    - [ ] www.example.com
    - [ ] example@fake.com
    - [ ] mailto:example@fake.com
- [x] Autolinks
    - [ ] www.example.com
    - [x] http://example.com
    - [x] https://example.com
    - [ ] example@fake.com
    - [ ] mailto:example@fake.com
- [ ] Reference-style Links
- [x] Images
    - [x] `src` attr
- [x] Horizontal rules
    - [x] With `---`
    - [x] With `***`
    - [x] With `___`
- [x] Unordered lists
- [x] Ordered lists
    - [x] `start` attr
- [x] Task lists
- [x] Nested lists
- [ ] One-line nested lists
- [ ] Adding Elements in Lists
- [x] Blockquotes
- [ ] Tables
- [ ] Subscript
- [ ] Superscript
- [ ] Emoji Shortcodes
- [ ] Html tags (e.g. `<div>`, `<span>`, `<a>`, `<img>`, etc.)