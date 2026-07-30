# `legacy-json` Generator

The `legacy-json` generator creates legacy JSON files for the API documentation for retro-compatibility with the previous documentation format.

## Configuring

- `output` {string} The directory where JSON files will be written.
- `ref` {string} Git reference/branch for linking to source files.
  **Default:** `'main'`.
- `minify` {boolean} Whether to minify the output JSON. **Default:** `false`.
