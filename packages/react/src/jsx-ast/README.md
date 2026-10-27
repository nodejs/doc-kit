# Page JSX

The `jsx-ast` stage turns each page's API entries into the JSX that the
[website](https://doc-kit.nodejs.org/generators/html) renders. It runs whenever
you build the site; configure it to change how your Markdown becomes pages.

**Stage:** `jsx-ast` · **Package:** [`@doc-kit/generator-react`](https://doc-kit.nodejs.org/packages/react) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** no files

## Usage

You don't request `jsx-ast` yourself: building the website runs it, since
`html` depends on it.

```bash
npx doc-kit generate -t html -i "docs/**/*.md" -o out
```

```text
ast → metadata → jsx-ast → html
```

With [section pages](https://doc-kit.nodejs.org/generators/section-pages),
`section-pages` runs between `metadata` and `jsx-ast`, so the section pages are
built here like any other page.

## Configuring

Options go in the `jsx-ast` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

```mjs displayName="doc-kit.config.mjs"
export default {
  global: {
    // Source links are built from it
    repository: 'my-org/kittens',
  },

  'jsx-ast': {
    // Link to the release branch instead of main
    ref: 'v2.x',
    showReadingTime: true,
  },
};
```

- `ref` {string} The Git ref of the "Source Code" link that an entry with a
  `source_link` gets under its heading, which points at
  `https://github.com/<repository>/blob/<ref>/<source_link>`. The default wins
  over `global.ref`, so `--git-ref` doesn't change it. **Default:** `'main'`.
- `generateNotFoundPage` {boolean} Whether to build the `404` page.
  **Default:** `true`.
- `showReadingTime` {boolean} Whether to estimate each page's reading time,
  such as `1 min read`, which the site shows in the page's meta bar.
  **Default:** `false`.
- `markdown` {Object} Your own [unified](https://unifiedjs.com/) plugins for
  the pages, added after the ones in `global.markdown`. See
  [The Markdown pipeline](#the-markdown-pipeline).
  - `remarkPlugins` {Array} Run on each page's Markdown syntax tree, before
    GitHub alerts are built. Global remark plugins don't run here: they
    already ran when `ast` parsed the files.
  - `rehypePlugins` {Array} Run on the HTML syntax tree, before code is
    highlighted.
  - `recmaPlugins` {Array} Run on the JavaScript syntax tree, before the JSX
    is printed.

Set `repository` in `global` whenever your pages use `source_link`.

## What gets a page

`jsx-ast` builds one page per document, holding all of that document's
entries:

- Every document with a `#` heading gets a page, and so does a document with
  no headings at all. A document whose headings all start at `##` or deeper
  gets no page, so give each document a title.
- With `generateNotFoundPage`, it adds a "Page Not Found" page that links back
  to `index.html`. `html` writes it as `404.html`, and your layout can tell it
  apart by its `api`, `'404'`.
- `all.html` isn't built here. `html` assembles it from the module pages'
  content (see its `generateAllPage` option), so no module is built twice.

Pages are ordered with `index`, `synopsis` and `documentation` first, then by
title. The sidebar (unless you configure `navigation.sidebar`), `all.html` and
`<DocumentationIndex />` all follow that order.

## The index page

An `index.md` or `index.mdx` at the top level of your input becomes
`index.html`, the site's home page. It's rendered like any other page, and
`all.html` leaves it out.

To list every page on it, write it in MDX and use the built-in
`<DocumentationIndex />` component, which needs no registering:

```mdx displayName="docs/index.mdx"
# Kittens

An API for feeding, petting and scheduling naps.

<DocumentationIndex />
```

`<DocumentationIndex />` links to every module page other than the index
(section pages and the `404` page aren't listed). Each entry shows the page's
title, its stability badge when the page has a page-level stability index, and
its description: the page's `llm_description`, or else its first paragraph.

Components only work in MDX. In a `.md` page, `<DocumentationIndex />` stays an
unknown HTML tag and renders nothing.

## What the Markdown becomes

Most of a page becomes plain HTML, but `jsx-ast` turns some parts into the
website's components:

| In the Markdown                                                | On the page                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Headings                                                       | An `id` from the heading's slug and a link to itself, a `DataTag` badge for the entry's kind (class, method, event and so on), and its change history. |
| Method, constructor and class method headings                  | A highlighted signature built from the heading and its typed list, such as `kittens.pet(name): boolean`. Classes get one when they extend another.     |
| Typed lists                                                    | A table of attributes (`FunctionSignature`). In MDX pages, lists stay lists.                                                                           |
| Type annotations, such as `{string}`                           | Highlighted code that links to the type's documentation.                                                                                               |
| Stability blockquotes                                          | An `AlertBox` colored by level: 0 danger, 1 warning, 2 success, 3 info.                                                                                |
| GitHub alerts, such as `> [!NOTE]`                             | An `AlertBox` titled Note, Tip, Important, Warning or Caution.                                                                                         |
| Fenced code                                                    | Shiki-highlighted code in a `CodeBox`, with its language and a copy button (left out for one-line blocks). Blocks under 5 lines have no line numbers.  |
| Adjacent fenced code blocks                                    | `CodeTabs`, one tab per block, labelled by its `displayName` or else its language. `active="true"` picks the tab shown first.                          |
| Other blockquotes                                              | A `Blockquote`.                                                                                                                                        |
| Tables                                                         | Wrapped in a scrolling container, with each cell labelled by its column header for narrow screens.                                                     |
| Footnotes                                                      | Moved to the end of the page's content.                                                                                                                |
| The `Type:` line under each `###` heading of `deprecations.md` | An `AlertBox`: info for Documentation or Compilation, warning for Runtime or Application, danger otherwise.                                            |

[Writing documentation](https://doc-kit.nodejs.org/writing-docs) covers how to
author each of these.

## The Markdown pipeline

Each page's tree runs through one [unified](https://unifiedjs.com/) processor,
in three steps. Your plugins slot into each one:

1. **remark**, on the Markdown syntax tree: the remark plugins in
   `jsx-ast.markdown`, then GitHub alerts. Your plugins run first, so they can
   produce alerts too.
2. **rehype**, on the HTML syntax tree, in this order:
   1. Conversion with `remark-rehype` (raw HTML kept, JSX passed through,
      types highlighted) and `rehype-raw`.
   2. The rehype plugins in `global.markdown`, then those in
      `jsx-ast.markdown`.
   3. Shiki, which highlights code and groups adjacent blocks into tabs.
   4. The `CodeBox`, `Blockquote`, table and footnote changes.
3. **recma**, on the JavaScript syntax tree: `rehype-recma` and `recma-jsx`,
   then the recma plugins in `global.markdown` and `jsx-ast.markdown`, then
   `recma-stringify`.

A plugin that adds Markdown syntax, such as `remark-math`, belongs in
`global.markdown.remarkPlugins`: the files are parsed in `ast`, which runs the
global remark plugins, and `jsx-ast` doesn't parse them again.

```mjs displayName="doc-kit.config.mjs"
export default {
  global: {
    markdown: {
      // Parses math wherever the files are parsed
      remarkPlugins: ['remark-math'],
    },
  },

  'jsx-ast': {
    markdown: {
      // Renders it on the site's pages
      rehypePlugins: ['rehype-katex'],
    },
  },
};
```

[Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins)
covers how to list a plugin, with or without options, and how its specifier
is resolved.

Listing a plugin that `jsx-ast` already has, such as
`@doc-kit/core/plugins/shiki/rehype.mjs`, configures it instead of adding it
twice. That's how you change the code themes or add languages; see
[Code highlighting](https://doc-kit.nodejs.org/configuration#code-highlighting).
Your plugins don't run on the small fragments `jsx-ast` renders on their own:
the types and descriptions in typed lists, and change history notes.

## What it produces

A [custom generator](https://doc-kit.nodejs.org/creating-generators) with
`dependsOn: '@doc-kit/generator-react/jsx-ast'` receives an array with one
object per page, in the order the worker threads finished them rather than page
order:

- `data` {Object} The page's head entry from `metadata`, with its `api`,
  `path`, heading and metadata.
- `headings` {Array} The table of contents: the page's headings down to `###`,
  with an overloaded function listed once.
  - `depth` {number} The heading level.
  - `value` {string} The label, such as `fs.readFile` for a method.
  - `slug` {string} The heading's `id`.
  - `stability` {number} The entry's stability index, `2` when it has none.
  - `data` {Object} The heading's `id` and the entry's `type`.
- `readingTime` {string|undefined} The estimated reading time, when
  `showReadingTime` is on.
- `content` {string} The page's content as JSX code: one fragment, without a
  layout. It uses the components above by name, without importing them.

`html` provides those components, wraps each page in its `#theme/Layout`, and
builds `all.html` from the module pages' `content`.
