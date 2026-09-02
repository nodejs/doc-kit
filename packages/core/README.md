# `@doc-kit/core`

The core of [doc-kit](https://github.com/nodejs/doc-kit): the engine that
turns API-shaped Markdown into documentation sites, JSON, man pages, and
more. It powers the Node.js API reference, and it can document any project.

The command-line interface lives in the companion
[`@doc-kit/cli`](https://www.npmjs.com/package/@doc-kit/cli) package.

## Generators

Output formats are provided by generators. This package ships the shared
pipeline stages and the JSON generators (`json`, `json-all`, and the
debugging-only `json-simple`); the rest come from companion packages:

| Package                                                                                | Generators                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`@doc-kit/generator-react`](https://www.npmjs.com/package/@doc-kit/generator-react)   | `html` (the modern site), `orama-db`, `llms-txt`, `sitemap`                           |
| [`@node-core/doc-kit-legacy`](https://www.npmjs.com/package/@node-core/doc-kit-legacy) | `legacy-html`, `legacy-html-all`, `legacy-json`, `legacy-json-all` (Node.js-specific) |
| [`@node-core/doc-kit`](https://www.npmjs.com/package/@node-core/doc-kit)               | `man-page`, `api-links`, `addon-verify` (Node.js-specific)                            |

Custom generators load by import specifier — any module whose default export
is a generator works as a `--target`.

## Contributing

This package lives in the [nodejs/doc-kit](https://github.com/nodejs/doc-kit)
monorepo. From this directory (or the repository root with
`npm run <script> --workspace @doc-kit/core`):

```sh
# Run this package's tests
npm test

# Re-run the tests on every change
npm run test:watch
```
