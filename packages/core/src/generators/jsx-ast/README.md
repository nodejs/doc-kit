## `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

### Configuring

The `jsx-ast` generator accepts the following configuration options:

| Name      | Type     | Default                                       | Description                                                              |
| --------- | -------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `ref`     | `string` | `'main'`                                      | Git reference/branch for linking to source files                         |
| `pageURL` | `string` | `'{baseURL}/latest-{version}/api{path}.html'` | URL template for documentation page links                                |
| `editURL` | `string` | `'${GITHUB_EDIT_URL}/doc/api{path}.md'`       | URL template for "edit this page" links                                  |
| `index`   | `array`  | -                                             | Array of `{ section, api }` objects defining the documentation structure |
