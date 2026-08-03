# `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

## Configuring

- `ref` {string} Git reference/branch for linking to source files.
  **Default:** `'main'`.
- `index` {Array} Array of `{ section, api }` objects defining the
  documentation structure.
- `generateAllPage` {boolean} When `true`, creates a synthetic JSX AST entry
  for `all.html`. **Default:** `true`.
- `generateIndexPage` {boolean} When `true`, creates a synthetic JSX AST entry
  for `index.html`. **Default:** `true`.
- `generateNotFoundPage` {boolean} When `true`, creates a synthetic JSX AST
  entry for `404.html`. **Default:** `true`.
