# `@node-core/doc-kit-legacy`

The generators for Node.js's legacy documentation formats: the classic JSON
files of the Node.js API docs, as Node.js's original
[documentation tooling](https://github.com/nodejs/node/tree/main/tools/doc)
wrote them, with the same structure and file names. They exist for Node.js and
the tools that read those files.

Other projects don't need them: build a site with the
[website](https://doc-kit.nodejs.org/generators/html) generator, and API data
with [JSON](https://doc-kit.nodejs.org/generators/json).

## Install

```sh
npm install --save-dev @doc-kit/cli @node-core/doc-kit-legacy
```

## Generators

The CLI loads each target name from this package: `legacy-json` loads
`@node-core/doc-kit-legacy/legacy-json`.

| Target                                                                     | Output                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`legacy-json`](https://doc-kit.nodejs.org/generators/legacy-json)         | A classic JSON file per source file, such as `fs.json`, with HTML in `desc` |
| [`legacy-json-all`](https://doc-kit.nodejs.org/generators/legacy-json-all) | `all.json`, the sections of every JSON file merged                          |

`legacy-json-all` runs `legacy-json` first.

## Usage

```sh
npx @doc-kit/cli generate -t legacy-json -i "doc/api/*.md" -o out
```
