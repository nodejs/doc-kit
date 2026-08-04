# `api-links` Generator

The `api-links` generator creates a mapping of publicly accessible functions to their source locations in the Node.js repository by analyzing JavaScript source files.

## Configuring

- `output` {string} The directory where `apilinks.json` will be written.
- `sourceURL` {string} URL template for linking to source files.
  **Default:** `'${GITHUB_BLOB_URL}lib/{fileName}'`.
- `minify` {boolean} Whether to minify the output JSON. Inherited from
  `global`. **Default:** `true`.
