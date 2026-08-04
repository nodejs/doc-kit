# `llms-txt` Generator

The `llms-txt` generator creates a `llms.txt` file to provide information to Large Language Models (LLMs) at inference time, containing links to all API documentation.

## Configuring

- `output` {string} The directory where `llms.txt` will be written.
- `templatePath` {string} Path to the template file.
  **Default:** `'template.txt'`.
- `pageURL` {string} URL template for documentation page links.
  **Default:** `'{baseURL}/latest/api{path}.md'`.
