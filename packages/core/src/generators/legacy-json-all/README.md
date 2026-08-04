# `legacy-json-all` Generator

The `legacy-json-all` generator consolidates data from the `legacy-json` generator into a single `all.json` file containing all API modules.

## Configuring

- `output` {string} The directory where `all.json` will be written.
- `minify` {boolean} Whether to minify the output JSON. **Default:** `false`.
- `index` {Array} Array of `{ api }` objects defining the module order.
