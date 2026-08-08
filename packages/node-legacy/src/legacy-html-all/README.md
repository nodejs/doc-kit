# `legacy-html-all` Generator

The `legacy-html-all` generator creates a single `all.html` file containing all API documentation modules in one file, based on the output from the `legacy-html` generator.

## Configuring

- `output` {string} The directory where `all.html` will be written.
- `templatePath` {string} Path to the HTML template file. Inherited from
  `legacy-html`. **Default:** `'template.html'`.
- `minify` {boolean} Whether to minify the output HTML. Inherited from
  `global`. **Default:** `true`.
- `version` {Object} Version object containing version information. Inherited
  from `global`. **Default:** `process.version`.
