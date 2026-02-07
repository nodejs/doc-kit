## `legacy-json` Generator

The `legacy-json` generator creates legacy JSON files for the API documentation for retro-compatibility with the previous documentation format.

### Configuring

The `legacy-json` generator accepts the following configuration options:

| Name     | Type      | Default  | Description                                      |
| -------- | --------- | -------- | ------------------------------------------------ |
| `output` | `string`  | -        | The directory where JSON files will be written   |
| `ref`    | `string`  | `'main'` | Git reference/branch for linking to source files |
| `minify` | `boolean` | `false`  | Whether to minify the output JSON                |
