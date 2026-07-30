# `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

## Configuring

The `jsx-ast` generator accepts the following configuration options:

| Name                   | Type      | Default  | Description                                                              |
| ---------------------- | --------- | -------- | ------------------------------------------------------------------------ |
| `ref`                  | `string`  | `'main'` | Git reference/branch for linking to source files                         |
| `index`                | `array`   | -        | Array of `{ section, api }` objects defining the documentation structure |
| `generateAllPage`      | `boolean` | `true`   | When `true`, creates a synthetic JSX AST entry for `all.html`            |
| `generateIndexPage`    | `boolean` | `true`   | When `true`, creates a synthetic JSX AST entry for `index.html`          |
| `generateNotFoundPage` | `boolean` | `true`   | When `true`, creates a synthetic JSX AST entry for `404.html`            |
