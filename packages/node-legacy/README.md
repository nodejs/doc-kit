# `@node-core/doc-kit-legacy`

The generators for Node.js's legacy documentation formats: the classic HTML
pages and JSON files of the Node.js API docs, as Node.js's original
[documentation tooling](https://github.com/nodejs/node/tree/main/tools/doc)
wrote them, with the same templates, anchors and file names. They exist for
Node.js and the tools that read those files.

Other projects don't need them: build a site with the
[website](https://doc-kit.nodejs.org/generators/html) generator, and API data
with [JSON](https://doc-kit.nodejs.org/generators/json).

## Install

```sh
npm install --save-dev @doc-kit/cli @node-core/doc-kit-legacy
```

## Generators

The CLI loads each target name from this package: `legacy-html` loads
`@node-core/doc-kit-legacy/legacy-html`.

| Target                                                                     | Output                                                                      |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`legacy-html`](https://doc-kit.nodejs.org/generators/legacy-html)         | A classic HTML page per source file, such as `fs.html`, and its `assets/`   |
| [`legacy-html-all`](https://doc-kit.nodejs.org/generators/legacy-html-all) | `all.html`, every page one after another                                    |
| [`legacy-json`](https://doc-kit.nodejs.org/generators/legacy-json)         | A classic JSON file per source file, such as `fs.json`, with HTML in `desc` |
| [`legacy-json-all`](https://doc-kit.nodejs.org/generators/legacy-json-all) | `all.json`, the sections of every JSON file merged                          |

`legacy-html-all` and `legacy-json-all` run `legacy-html` and `legacy-json`
first.

## Usage

```sh
npx @doc-kit/cli generate -t legacy-html -t legacy-json -i "doc/api/*.md" -o out
```

> [!IMPORTANT]
> The HTML pages build their source and edit links from `repository`, and the
> version picker's links from `baseURL`, which have no flags. Set them under
> `global` in your configuration file (`nodejs/node` and
> `https://nodejs.org/docs`), or extend the
> [Node.js preset](https://doc-kit.nodejs.org/packages/node), which sets both,
> along with `changelog`.
