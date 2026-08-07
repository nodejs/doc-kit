# `@nodejs/doc-kit`

The core of [doc-kit](https://github.com/nodejs/doc-kit): the CLI and the
engine that turn API-shaped Markdown into documentation sites, JSON, man
pages, and more. It powers the Node.js API reference, and it can document any
project.

## Generators

Output formats are provided by generators. This package ships the shared
pipeline stages and `json-simple`; the rest come from companion packages,
installable with `doc-kit install <generator>`:

| Package                                                                                | Generators                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [`@doc-kit/generator-react`](https://www.npmjs.com/package/@doc-kit/generator-react)   | `html` (the modern site), `orama-db`, `llms-txt`, `sitemap`        |
| [`@doc-kit/generator-legacy`](https://www.npmjs.com/package/@doc-kit/generator-legacy) | `legacy-html`, `legacy-html-all`, `legacy-json`, `legacy-json-all` |
| [`@node-core/doc-kit`](https://www.npmjs.com/package/@node-core/doc-kit)               | `man-page`, `api-links`, `addon-verify` (Node.js-specific)         |

Custom generators load by import specifier — any module whose default export
is a generator works as a `--target`.

## Contributing

This package lives in the [nodejs/doc-kit](https://github.com/nodejs/doc-kit)
monorepo. From this directory (or the repository root with
`npm run <script> --workspace @nodejs/doc-kit`):

```sh
# Run the CLI
npm run run -- generate --help

# Re-run the CLI on every change
npm run watch

# Run this package's tests
npm test
```
