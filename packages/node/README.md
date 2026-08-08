# `@node-core/doc-kit`

The Node.js-specific generators for
[doc-kit](https://github.com/nodejs/doc-kit): outputs consumed by the Node.js
project's own build, release, and documentation processes. If you are not
building Node.js itself (or something shaped exactly like it), you probably
want one of the [general-purpose generators](https://doc-kit.nodejs.org)
instead.

## Install

```sh
npm install --save-dev @doc-kit/core @node-core/doc-kit
```

## Generators

| Target         | Output                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------- |
| `man-page`     | The `node.1` manual page, from the CLI options documented in `cli.md`.                    |
| `api-links`    | A mapping of API symbols to their source locations, powering source links on nodejs.org.  |
| `addon-verify` | Extracted C++ addon code samples from `addons.md`, arranged for compilation by the tests. |

## Usage

```sh
npx @doc-kit/cli generate -t man-page -i "doc/api/cli.md" -o out
```

See the [doc-kit documentation](https://doc-kit.nodejs.org) for
configuration and the full generator references.
