# `@node-core/doc-kit-legacy`

The Node.js legacy-format generators for
[doc-kit](https://github.com/nodejs/doc-kit): 1:1 matches for the output of
Node.js's [original documentation
tooling](https://github.com/nodejs/node/tree/main/tools/doc), for consumers
that depend on the classic JSON layouts.

## Install

```sh
npm install --save-dev @doc-kit/core @node-core/doc-kit-legacy
```

## Generators

| Target            | Output                                                     |
| ----------------- | ---------------------------------------------------------- |
| `legacy-json`     | The classic per-document JSON, as published on nodejs.org. |
| `legacy-json-all` | The single-file JSON bundling every document together.     |

## Usage

```sh
npx @doc-kit/cli generate -t legacy-json -i "doc/api/*.md" -o out
```

Unless you have consumers of these exact formats, prefer the modern
[`json` generator](https://doc-kit.nodejs.org/generators/json) from
`@doc-kit/core`. See the
[doc-kit documentation](https://doc-kit.nodejs.org) for details.
