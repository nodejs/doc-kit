## `legacy-html` Generator

The `legacy-html` generator creates legacy HTML documentation pages for Node.js API documentation with included assets and styles for retro-compatibility.

### Configuring

The `legacy-html` generator accepts the following configuration options:

| Name                    | Type       | Default                 | Description                                                              |
| ----------------------- | ---------- | ----------------------- | ------------------------------------------------------------------------ |
| `output`                | `string`   | -                       | The directory where HTML files and assets will be written                |
| `templatePath`          | `string`   | `'template.html'`       | Path to the HTML template file                                           |
| `additionalPathsToCopy` | `string[]` | `['assets']`            | Array of paths to copy to the output directory                           |
| `ref`                   | `string`   | `'main'`                | Git reference/branch for linking to source files                         |
| `index`                 | `array`    | -                       | Array of `{ api, section }` objects defining the documentation structure |
| `minify`                | `boolean`  | Inherited from `global` | Whether to minify the output HTML                                        |
