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
npx @doc-kit/cli generate -t html -t orama-db -i "docs/**/*.md" -o out
```

The site shows a search box when the search index is built in the same run.
For a real project, keep the settings in a
[configuration file](https://doc-kit.nodejs.org/configuration);
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

## Customizing the site

The site's content, look and build are options of `html`, listed in the
[Website](https://doc-kit.nodejs.org/generators/html#configuring) reference.
[Customizing the site](https://doc-kit.nodejs.org/customization) walks through
them.

## Exports

| Import                                        | What it is                                                                                                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@doc-kit/generator-react/<target>`           | Each generator above, and `jsx-ast`, as the default export. The target names resolve to these, and a custom generator can name one in `dependsOn`.                                          |
| `@doc-kit/generator-react/html/bundlers/vite` | `createViteBundler(options)`, the default bundler adapter: pass it your Vite configuration and set the result as `html.bundler`.                                                            |
| `@doc-kit/generator-react/html/ui/*`          | The site's UI source, for theme components that build on it, such as `components/Layout/index.jsx` (the default layout) and `islands/withIsland.jsx` (hydrates a component in the browser). |
