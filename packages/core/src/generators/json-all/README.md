# `json-all` Generator

The `json-all` generator bundles the documents of the [`json`](./json.md)
generator into a single `all.json` file.

```sh
npx @doc-kit/cli generate -t json-all -i "doc/api/*.md" -o out --index doc/api/index.md
```

```json
{
  "$schema": "https://doc-kit.nodejs.org/schemas/api-doc-all/1.0.0.json",
  "documents": []
}
```

`documents` holds every document in the order of the configured `index`,
then the rest by `id`. The bundle's schema, shipped as
`@doc-kit/core/generators/json-all/schema.json`, refers to the `json`
generator's schema for the documents.

## Configuring

- `output` {string} The directory where `all.json` will be written.
- `minify` {boolean} Whether to minify the output. Inherited from `global`.
  **Default:** `true`.
- `index` {Array} The `{ api }` objects defining the document order. Inherited
  from `global`.
- `schemaURL` {string} Where the bundle's schema is published.
  `{schemaVersion}` is filled in. **Default:**
  `'https://doc-kit.nodejs.org/schemas/api-doc-all/{schemaVersion}.json'`.
