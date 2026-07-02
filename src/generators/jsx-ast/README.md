## `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

### Configuring

The `jsx-ast` generator accepts the following configuration options:

| Name                   | Type      | Default  | Description                                                              |
| ---------------------- | --------- | -------- | ------------------------------------------------------------------------ |
| `ref`                  | `string`  | `'main'` | Git reference/branch for linking to source files                         |
| `index`                | `array`   | -        | Array of `{ section, api }` objects defining the documentation structure |
| `generateAllPage`      | `boolean` | `true`   | When `true`, creates a synthetic JSX AST entry for `all.html`            |
| `generateIndexPage`    | `boolean` | `true`   | When `true`, creates a synthetic JSX AST entry for `index.html`          |
| `generateNotFoundPage` | `boolean` | `true`   | When `true`, creates a synthetic JSX AST entry for `404.html`            |
| `notFoundText`         | `string`  | `'The page you requested could not be found. Use the navigation to find the documentation you are looking for, or return to the '` | Lead-in text shown before the link on the synthetic `404.html` page |
| `notFoundLinkUrl`      | `string`  | `'index.html'` | URL of the link shown on the synthetic `404.html` page            |
| `notFoundLinkText`     | `string`  | `'API index'` | Text of the link shown on the synthetic `404.html` page             |
