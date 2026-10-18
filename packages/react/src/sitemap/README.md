# `sitemap` Generator

The `sitemap` generator creates a `sitemap.xml` file for search engine optimization (SEO), listing all API documentation pages.

## Configuring

- `output` {string} The directory where `sitemap.xml` will be written.
- `indexURL` {string} URL template for the API documentation index page.
  **Default:** `'{baseURL}/'`.
- `pageURL` {string} URL template for individual documentation pages. `{path}`
  is the page's extensionless path and starts with a slash
  **Default:** `'{baseURL}{path}.html'`.
