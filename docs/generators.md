# Generators

A generator is an output format.

```bash
npx @doc-kit/cli generate -t html -t orama-db -t sitemap -i "docs/**/*.md" -o out
```

## Built-in generators

### Web ([`@doc-kit/generator-react`](./packages/react.md))

| Target                                 | Output                                                               |
| -------------------------------------- | -------------------------------------------------------------------- |
| [`html`](./generators/html.md)         | The modern documentation site: server-rendered, hydrated, themeable. |
| [`orama-db`](./generators/orama-db.md) | The search index behind the `html` site's search box.                |
| [`llms-txt`](./generators/llms-txt.md) | An [`llms.txt`](https://llmstxt.org/) index for language models.     |
| [`sitemap`](./generators/sitemap.md)   | A `sitemap.xml` for search engines.                                  |
| [`chunked`](./generators/chunked.md)   | The `html` site and sitemap, plus one page per section of a module.  |

### JSON ([`@doc-kit/core`](./packages/core.md))

| Target                                       | Output                                                   |
| -------------------------------------------- | -------------------------------------------------------- |
| [`json-simple`](./generators/json-simple.md) | A simplified JSON rendering of the parsed documentation. |

### Legacy ([`@node-core/doc-kit-legacy`](./packages/node-legacy.md))

1:1 matches for Node.js's original documentation tooling, for consumers of
the classic layouts.

| Target                                               | Output                              |
| ---------------------------------------------------- | ----------------------------------- |
| [`legacy-html`](./generators/legacy-html.md)         | One classic HTML page per document. |
| [`legacy-html-all`](./generators/legacy-html-all.md) | The single-page `all.html` bundle.  |
| [`legacy-json`](./generators/legacy-json.md)         | The classic per-document JSON.      |
| [`legacy-json-all`](./generators/legacy-json-all.md) | The single-file JSON bundle.        |

### Node.js-specific ([`@node-core/doc-kit`](./packages/node.md))

Outputs consumed by the Node.js project's own build and release processes.

| Target                                         | Output                                              |
| ---------------------------------------------- | --------------------------------------------------- |
| [`man-page`](./generators/man-page.md)         | The `node.1` manual page.                           |
| [`api-links`](./generators/api-links.md)       | A map of API symbols to their source locations.     |
| [`addon-verify`](./generators/addon-verify.md) | Extracted addon code samples, arranged for testing. |

## Pipeline stages

The targets above are built on a few shared stages, each of which is itself a
generator.

| Stage                                  | Produces                                              |
| -------------------------------------- | ----------------------------------------------------- |
| [`ast`](./generators/ast.md)           | Markdown parsed into MDAST, across worker threads.    |
| [`ast-js`](./generators/ast-js.md)     | JavaScript sources parsed into an AST.                |
| [`metadata`](./generators/metadata.md) | The flattened API entries every output is built from. |
| [`jsx-ast`](./generators/jsx-ast.md)   | Those entries as JSX, ready for the web generators.   |

## Custom generators

A target can also be an import specifier — a package export or a local file
whose default export is a generator:

```bash
npx @doc-kit/cli generate -t @my-scope/my-generator -t ./generators/rss.mjs ...
```

To build one, see [Creating generators](./creating-generators.md).
