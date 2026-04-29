## `web-all` Generator

The `web-all` generator complements `web` by producing the pages that the
per-module pipeline does not generate on its own:

- `all.html`: every API module concatenated into a single page. Useful for
  offline browsing and for environments where JavaScript is unavailable, since
  the in-page searchbar shipped with `web` requires JS, so a single all-in-one
  page makes browser-native text search (`Ctrl`+`F`) usable across the full
  documentation set.
- `index.html`: a synthetic landing page listing every module alongside a
  Stability Overview table. The `web` generator skips its `index` entry so
  this file is the canonical index.
- `404.html`: a static not-found page wired into the same Layout, so hosts
  serving the docs can use it as a fallback.

### Configuring

The `web-all` generator accepts the following configuration options:

| Name           | Type     | Default              | Description                    |
| -------------- | -------- | -------------------- | ------------------------------ |
| `templatePath` | `string` | Inherited from `web` | Path to the HTML template file |
