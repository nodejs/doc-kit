# `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

## Configuring

- `ref` {string} Git reference/branch for linking to source files.
  **Default:** `'main'`.
- `index` {Array} Array of `{ section, api }` objects defining the
  documentation structure.
- `generateAllPage` {boolean} When `true`, creates a synthetic JSX AST entry
  for `all.html`. **Default:** `true`.
- `generateNotFoundPage` {boolean} When `true`, creates a synthetic JSX AST
  entry for `404.html`. **Default:** `true`.

## Index page

`index.html` is generated when an `index` document is part of the input, and
is rendered from that document like any other page. An MDX `index` document
can render the stability overview of every module by using the built-in
`<DocumentationIndex />` component (see the `html` generator's README).
