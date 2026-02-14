## `api-links` Generator

The `api-links` generator creates a mapping of publicly accessible functions to their source locations in the Node.js repository by analyzing JavaScript source files.

### Configuring

The `api-links` generator accepts the following configuration options:

| Name     | Type      | Default                 | Description                                         |
| -------- | --------- | ----------------------- | --------------------------------------------------- |
| `output` | `string`  | -                       | The directory where `apilinks.json` will be written |
| `minify` | `boolean` | Inherited from `global` | Whether to minify the output JSON                   |
