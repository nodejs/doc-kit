# `@doc-kittens/legacy/html`

The `legacy-html` generator creates one legacy HTML documentation page per API module, including bundled assets and styles, for retro-compatibility with the historical Node.js documentation format.

## Configuring

| Name                    | Type       | Default                                       | Description                                                              |
| ----------------------- | ---------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `output`                | `string`   | -                                             | The directory where HTML files and assets will be written                |
| `templatePath`          | `string`   | `'template.html'`                             | Path to the HTML template file                                           |
| `additionalPathsToCopy` | `string[]` | `['assets']`                                  | Array of paths to copy to the output directory                           |
| `ref`                   | `string`   | `'main'`                                      | Git reference/branch for linking to source files                         |
| `pageURL`               | `string`   | `'{baseURL}/latest-{version}/api{path}.html'` | URL template for documentation page links                                |
| `editURL`               | `string`   | `'${GITHUB_EDIT_URL}/doc/api{path}.md'`       | URL template for "edit this page" links                                  |
| `index`                 | `array`    | -                                             | Array of `{ api, section }` objects defining the documentation structure |
| `minify`                | `boolean`  | Inherited from `global`                       | Whether to minify the output HTML                                        |
