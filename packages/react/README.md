# `@doc-kit/generator-react`

The website generators for [doc-kit](https://doc-kit.nodejs.org): a static
documentation site, rendered with Preact and bundled with Vite, and the outputs
that usually ship with one: the search index, a sitemap, and `llms.txt` files
for language models. Install it to build any of these. The JSON outputs come
with `@doc-kit/core` and don't need it.

## Install

```sh
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
```

Once it's installed next to the CLI, the target names below resolve to this
package.

## Usage

Build the site and its search index into `out/`:

```sh
npx doc-kit generate -t html -t orama-db -i "docs/**/*.md" -o out
```

The site shows a search box when the search index is built in the same run.

For a real project, keep the settings in a `doc-kit.config.mjs` at its root and
run `npx doc-kit generate`. Settings every generator shares go under `global`,
and each generator's own options under its target name:

```js displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'orama-db', 'sitemap', 'llms-txt'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
    // Where the site is published: the sitemap and llms.txt URLs start with it
    baseURL: 'https://docs.example.com',
  },
  html: {
    // Page titles become "<page name> | <project>"
    title: '{project}',
  },
};
```

`{project}` is `global.project`, which defaults to the `name` in your
`package.json`. The default title also has `{version}`, which is the version of
Node.js running doc-kit unless you set `global.version`.
[Getting started](https://doc-kit.nodejs.org/getting-started) walks through a
first site.

## Generators

| Target          | Writes                                                                                                                                              | Reference                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `html`          | The site: a page per input file, `all.html`, `404.html`, their scripts and styles, and copies of `assets/`, `public/` and `static/` (`pathsToCopy`) | [Website](https://doc-kit.nodejs.org/generators/html)                |
| `section-pages` | A page per section of each module (`fs/readFile.html`), added to the site and sitemap                                                               | [Section pages](https://doc-kit.nodejs.org/generators/section-pages) |
| `orama-db`      | `orama-db.json`, the search index the site's search box loads                                                                                       | [Search index](https://doc-kit.nodejs.org/generators/orama-db)       |
| `sitemap`       | `sitemap.xml`, listing every page for search engines                                                                                                | [Sitemap](https://doc-kit.nodejs.org/generators/sitemap)             |
| `llms-txt`      | `llms.txt`, a link to every page with its description, for language models                                                                          | [llms.txt](https://doc-kit.nodejs.org/generators/llms-txt)           |
| `llms-txt-full` | `llms-full.txt`, every page's Markdown in one file, each preceded by its URL                                                                        | [llms-full.txt](https://doc-kit.nodejs.org/generators/llms-txt-full) |

The package also ships `jsx-ast`
([Page JSX](https://doc-kit.nodejs.org/generators/jsx-ast)), the stage that
turns each page's API entries into JSX for `html`. It runs whenever `html`
does, so it isn't one of the CLI's targets.

## How they fit together

```text
ast → metadata ─┬→ jsx-ast → html
                ├→ orama-db
                ├→ sitemap
                ├→ llms-txt
                └→ llms-txt-full
```

[`ast`](https://doc-kit.nodejs.org/generators/ast) and
[`metadata`](https://doc-kit.nodejs.org/generators/metadata) come from
`@doc-kit/core`. They parse your sources into API entries once per run, however
many of these targets read them.

`section-pages` writes nothing itself. It adds its pages to the entries that
`jsx-ast` and `sitemap` read, so `-t section-pages` on its own builds the site
and the sitemap with section pages, while `-t html -t section-pages` only adds
them to the site.

## Customizing the site

The site's content, look and build are options of `html`. These are the ones
you'll reach for first:

- `title` {string} The text after the page name in every page's title.
  **Default:** `'{project} {version} Documentation'`.
- `head` {Object} `<meta>` and `<link>` tags, and raw markup, for the `<head>`.
  **Default:** `{ meta: [], links: [], html: [] }`.
- `navigation` {Object} The sidebar groups, the navigation bar's links, and
  whether to link the previous and next page. **Default:**
  `{ showCrossLinks: false }`.
- `imports` {Object} Your own components for the `#theme/*` parts of the page:
  logo, navigation bar, sidebar, meta bar, footer and layout. **Default:** the
  built-in components.
- `stylesheets` {string[]} Stylesheets bundled after the built-in one, so your
  rules win. **Default:** `[]`.
- `components` {Object} Components you can use in MDX, by tag name.
  **Default:** `{}`.

[Customizing the site](https://doc-kit.nodejs.org/customization) walks through
them, and the [Website](https://doc-kit.nodejs.org/generators/html) reference
lists every option.

## Exports

| Import                                        | What it is                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@doc-kit/generator-react/<target>`           | Each generator above, and `jsx-ast`, as the default export. The target names resolve to these, and a custom generator can name one in `dependsOn`.                                          |
| `@doc-kit/generator-react/html/bundlers/vite` | `createViteBundler(options)`, the default bundler adapter: pass it your Vite configuration and set the result as `html.bundler`.                                                            |
| `@doc-kit/generator-react/html/ui/*`          | The site's UI source, for theme components that build on it, such as `components/Layout/index.jsx` (the default layout) and `islands/withIsland.jsx` (hydrates a component in the browser). |

## Learn more

- [Customizing the site](https://doc-kit.nodejs.org/customization): colors,
  logo, navigation, theme slots and MDX components.
- [Publishing your docs](https://doc-kit.nodejs.org/publishing): putting the
  site online.
- [Configuration](https://doc-kit.nodejs.org/configuration): every global
  option.
- [Creating generators](https://doc-kit.nodejs.org/creating-generators):
  building on these generators' output.
