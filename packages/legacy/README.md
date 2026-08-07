# `@doc-kit/generator-legacy`

The legacy-format generators for [doc-kit](https://github.com/nodejs/doc-kit):
1:1 matches for the output of Node.js's [original documentation
tooling](https://github.com/nodejs/node/tree/main/tools/doc), for consumers
that depend on the classic HTML and JSON layouts.

## Install

```sh
npm install --save-dev @nodejs/doc-kit @doc-kit/generator-legacy
```

Or let doc-kit install it for you:

```sh
npx doc-kit install legacy-html
```

## Generators

| Target            | Output                                                       |
| ----------------- | ------------------------------------------------------------ |
| `legacy-html`     | One classic HTML page per input document.                    |
| `legacy-html-all` | The single-page `all.html` bundling every document together. |
| `legacy-json`     | The classic per-document JSON, as published on nodejs.org.   |
| `legacy-json-all` | The single-file JSON bundling every document together.       |

## Usage

```sh
npx doc-kit generate -t legacy-html -t legacy-json -i "doc/api/*.md" -o out
```

Unless you have consumers of these exact formats, prefer the modern
[`html` generator](https://doc-kit.nodejs.org/generators/html) from
`@doc-kit/generator-react`. See the
[doc-kit documentation](https://doc-kit.nodejs.org) for details.
