## `orama-db` Generator

The `orama-db` generator creates an Orama database for the API documentation to enable full-text search functionality.

### Configuring

The `orama-db` generator accepts the following configuration options:

| Name     | Type      | Default                 | Description                                         |
| -------- | --------- | ----------------------- | --------------------------------------------------- |
| `output` | `string`  | -                       | The directory where `orama-db.json` will be written |
| `minify` | `boolean` | Inherited from `global` | Whether to minify the output JSON                   |
