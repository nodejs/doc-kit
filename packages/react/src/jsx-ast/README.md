# `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

## Configuring

- `ref` {string} Git reference/branch for linking to source files.
  **Default:** `'main'`.
- `index` {Array} Array of `{ section, api }` objects defining the
  documentation structure.
- `generateNotFoundPage` {boolean} When `true`, creates a synthetic JSX AST
  entry for `404.html`. **Default:** `true`.
- `showReadingTime` {boolean} When `true`, computes an estimated reading time
  for each page and displays it in the MetaBar. **Default:** `false`.

## Output

Each page is emitted as `{ data, headings, readingTime, content }`: the page's
head entry, its table of contents, the optional reading time, and the processed
content serialized to JSX code as one fragment. The page layout is not part of
the content — the `html` generator wraps each page in `<Layout>`, and assembles
`all.html` from the module pages' content (see its `generateAllPage` option)
rather than building every module a second time here.

## Index page

`index.html` is generated when an `index` document is part of the input, and
is rendered from that document like any other page. An MDX `index` document
can render the stability overview of every module by using the built-in
`<DocumentationIndex />` component (see the `html` generator's README).
