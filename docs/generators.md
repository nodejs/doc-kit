# Generators

A generator makes one output from your documentation: the website, the search
index, JSON, a man page. You pick generators by their target name with
`--target` (`-t`) on the [CLI](./cli.md), or with `target` in the
[configuration file](./configuration.md). However many you pick, doc-kit parses
your sources once and every generator reads that result.

```bash
npx doc-kit generate -t html -t orama-db -i "docs/**/*.md" -o out
```

![Generators form a graph through dependsOn; picking html and orama-db runs only them and what they depend on, parsing your sources once](./diagrams/generator-graph.svg)

Each generator has a reference page laid out the same way: what it makes, how
to run it, what it reads and writes, its options, then the details.

## The website

From [`@doc-kit/generator-react`](./packages/react.md), which you install next
to the CLI.

| Generator                                      | Target          | Output                                                                                  |
| ---------------------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| [Website](./generators/html.md)                | `html`          | The site: server-rendered pages with interactive islands, bundled with Vite by default. |
| [Section pages](./generators/section-pages.md) | `section-pages` | An extra page for each section of every module, added to the website and the sitemap.   |
| [Search index](./generators/orama-db.md)       | `orama-db`      | `orama-db.json`, the Orama index that the website's search box loads.                   |
| [Sitemap](./generators/sitemap.md)             | `sitemap`       | `sitemap.xml`, listing the pages for search engines.                                    |

- The search box shows only when the search index is built in the same run.
  Set [`showSearchBox`](./generators/html.md#configuring) in the `html` section
  to choose yourself.
- `section-pages` adds its pages to whichever of `html` and `sitemap` you also
  ask for. Ask for it on its own and you get both.
- `web`, the former name of `html`, still works as a target.

## For language models

From [`@doc-kit/generator-react`](./packages/react.md).

| Generator                                              | Target          | Output                                                                  |
| ------------------------------------------------------ | --------------- | ----------------------------------------------------------------------- |
| [llms.txt](./generators/llms-txt.md)                   | `llms-txt`      | An [`llms.txt`](https://llmstxt.org/) index linking to each page.       |
| [llms-full.txt](./generators/llms-txt.md#llms-fulltxt) | `llms-txt-full` | `llms-full.txt`: every page's Markdown in one file, each after its URL. |

## Data

From [`@doc-kit/core`](./packages/core.md), which comes with the CLI.

| Generator                                       | Target        | Output                                                                 |
| ----------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| [JSON](./generators/json.md)                    | `json`        | One JSON document per source file, described by a published schema.    |
| [JSON bundle](./generators/json.md#json-bundle) | `json-all`    | Every `json` document bundled into one `all.json`.                     |
| [Debug JSON](./generators/json.md#debug-json)   | `json-simple` | `api-docs.json`, a dump of the API entries for debugging the pipeline. |

## For Node.js

From [`@node-core/doc-kit`](./packages/node.md), which you install next to the
CLI. These serve the Node.js project's own build, release and tests, and their
defaults match its layout, so they're mostly useful to Node.js and projects
shaped like it.

| Generator                                      | Target         | Output                                                                               |
| ---------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| [Man page](./generators/man-page.md)           | `man-page`     | A man page in mdoc format (`node.1` by default), from a command-line reference page. |
| [API links](./generators/api-links.md)         | `api-links`    | `apilinks.json`, mapping each exported API to the line defining it in the sources.   |
| [Addon examples](./generators/addon-verify.md) | `addon-verify` | The C++ addon examples' code blocks, written out with a `binding.gyp` for the tests. |

## Pipeline stages

The generators above read from a few shared stages, which are generators too. A
stage runs when a target needs it, once per run however many targets read it,
and writes no files. You don't ask for stages yourself, but you configure them
like any other generator: `--type-map`, for example, sets `metadata.typeMap`.

| Stage                                        | Name       | Produces                                                                            |
| -------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| [Parsing Markdown](./generators/ast.md)      | `ast`      | The Markdown and MDX files in `input`, parsed into syntax trees in worker threads.  |
| [Parsing JavaScript](./generators/ast-js.md) | `ast-js`   | The `.js` files in `input`, parsed with Acorn for `api-links`.                      |
| [API entries](./generators/metadata.md)      | `metadata` | The flat list of API entries, one per heading with its kind, stability and history. |
| [Page JSX](./generators/jsx-ast.md)          | `jsx-ast`  | Each page as a JSX program, which `html` renders.                                   |

`jsx-ast` comes from `@doc-kit/generator-react`; the other stages come from
`@doc-kit/core`.

## Options

Each generator reads its options from the configuration section named after it,
and takes any option it doesn't set there from `global`. Each generator's page
lists its options, and [Configuration](./configuration.md) covers the file
itself.

```js displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'orama-db', 'sitemap'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
    baseURL: 'https://example.com',
  },
  html: {
    title: '{project} documentation',
  },
};
```

With this file in place, `npx doc-kit generate` needs no flags. Targets you pass
with `-t` replace the file's `target` list rather than adding to it.

## Your own

A target can also be an import specifier: a package export, or the path to a
local file (starting with `.`, or absolute) whose default export is a generator.
It runs alongside the built-in ones, and reads its options from the section
named after its `name`.

```bash
npx doc-kit generate -t html -t ./generators/rss.mjs -i "docs/**/*.md" -o out
```

To write one, see [Creating generators](./creating-generators.md).
