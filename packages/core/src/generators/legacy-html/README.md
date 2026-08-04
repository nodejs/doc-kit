# `legacy-html` Generator

The `legacy-html` generator creates legacy HTML documentation pages for Node.js API documentation with included assets and styles for retro-compatibility.

## Configuring

- `output` {string} The directory where HTML files and assets will be written.
- `templatePath` {string} Path to the HTML template file.
  **Default:** `'template.html'`.
- `additionalPathsToCopy` {string[]} Array of paths to copy to the output
  directory. **Default:** `['assets']`.
- `ref` {string} Git reference/branch for linking to source files.
  **Default:** `'main'`.
- `pageURL` {string} URL template for documentation page links.
  **Default:** `'{baseURL}/latest-{version}/api{path}.html'`.
- `editURL` {string} URL template for "edit this page" links.
  **Default:** `'${GITHUB_EDIT_URL}/doc/api{path}.md'`.
- `index` {Array} Array of `{ api, section }` objects defining the
  documentation structure.
- `minify` {boolean} Whether to minify the output HTML. Inherited from
  `global`. **Default:** `true`.
