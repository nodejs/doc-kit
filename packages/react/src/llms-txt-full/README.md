# `llms-txt-full` Generator

The `llms-txt-full` generator creates a `llms-full.txt` file holding the Markdown of every page, each preceded by its URL, so Large Language Models (LLMs) can read the whole documentation in one request. Pages are rebuilt from their metadata entries, leaving out the ones other generators create.

## Configuring

- `output` {string} The directory where `llms-full.txt` will be written.
- `pageURL` {string} URL template for the URL preceding each page.
  **Default:** `'{baseURL}{path}.md'`.
