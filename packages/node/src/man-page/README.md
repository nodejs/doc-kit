# `man-page` Generator

The `man-page` generator creates a Unix man page version of the Node.js CLI documentation in mdoc format.

## Configuring

- `output` {string} The directory where the man page file will be written.
- `fileName` {string} Name of the output file. **Default:** `'node.1'`.
- `cliOptionsHeaderSlug` {string} Slug for the CLI options header section.
  **Default:** `'options'`.
- `envVarsHeaderSlug` {string} Slug for the environment variables header
  section. **Default:** `'environment-variables-1'`.
- `templatePath` {string} Path to the man page template file.
  **Default:** `'template.1'`.
