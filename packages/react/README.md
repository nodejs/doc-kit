# `@nodejs/doc-kit-generator-react`

The modern web generators for [doc-kit](https://github.com/nodejs/doc-kit):
a server-rendered, client-hydrated documentation site with search, plus the
machine-readable formats that usually accompany one.

## Install

```sh
npm install --save-dev @nodejs/doc-kit @nodejs/doc-kit-generator-react
```

Or let doc-kit install it for you:

```sh
npx doc-kit install html
```

## Generators

| Target     | Output                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------- |
| `html`     | The full documentation site — server-rendered pages hydrated with Preact, bundled with Vite. |
| `orama-db` | An [Orama](https://orama.com) search index, consumed by the `html` site's search box.        |
| `llms-txt` | An [`llms.txt`](https://llmstxt.org/) index for Large Language Models.                       |
| `sitemap`  | A `sitemap.xml` for search engines.                                                          |

The package also provides `jsx-ast`, the intermediate stage that turns parsed
API metadata into JSX; it runs automatically when `html` needs it and is not a
target you invoke yourself.

## Usage

```sh
npx doc-kit generate -t html -t orama-db -i "docs/**/*.md" -o out
```

The `html` generator is deeply customizable — project name, page titles,
`<head>` markup, sidebar and navigation bar, theme components, and even the
bundler are all configuration. See the [`html` generator
reference](https://doc-kit.nodejs.org/generators/html) and the
[doc-kit documentation](https://doc-kit.nodejs.org) for the full
options.
