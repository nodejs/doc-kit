## `json-simple` Generator

The `json-simple` generator creates a simplified JSON version of the API documentation, primarily for debugging and testing purposes.

### Configuring

The `json-simple` generator accepts the following configuration options:

| Name     | Type      | Default                 | Description                                         |
| -------- | --------- | ----------------------- | --------------------------------------------------- |
| `output` | `string`  | -                       | The directory where `api-docs.json` will be written |
| `minify` | `boolean` | Inherited from `global` | Whether to minify the output JSON                   |
