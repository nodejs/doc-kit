## `legacy-json-all` Generator

The `legacy-json-all` generator consolidates data from the `legacy-json` generator into a single `all.json` file containing all API modules.

### Configuring

The `legacy-json-all` generator accepts the following configuration options:

| Name     | Type      | Default | Description                                          |
| -------- | --------- | ------- | ---------------------------------------------------- |
| `output` | `string`  | -       | The directory where `all.json` will be written       |
| `minify` | `boolean` | `false` | Whether to minify the output JSON                    |
| `index`  | `array`   | -       | Array of `{ api }` objects defining the module order |
