## `sitemap` Generator

The `sitemap` generator creates a `sitemap.xml` file for search engine optimization (SEO), listing all API documentation pages.

### Configuring

The `sitemap` generator accepts the following configuration options:

| Name       | Type     | Default                   | Description                                       |
| ---------- | -------- | ------------------------- | ------------------------------------------------- |
| `output`   | `string` | -                         | The directory where `sitemap.xml` will be written |
| `indexURL` | `string` | `'{baseURL}/latest/api/'` | URL template for the API documentation index page |
| `pageURL`  | `string` | `'{indexURL}{path}.html'` | URL template for individual documentation pages   |
