# Page JSX

The `jsx-ast` stage turns each page's API entries into the JSX that the
[website](https://doc-kit.nodejs.org/generators/html) renders. It runs whenever
you build the site, since `html` depends on it. With
[section pages](https://doc-kit.nodejs.org/generators/section-pages),
`section-pages` runs between `metadata` and `jsx-ast`, so the section pages are
built here like any other page.

## Configuring

- `ref` {string} The Git ref of the "Source Code" link that an entry with a
  `source_link` gets under its heading, which points at
  `https://github.com/<repository>/blob/<ref>/<source_link>`. The default wins
  over `global.ref`, so `--git-ref` doesn't change it. **Default:** `'main'`.
- `generateNotFoundPage` {boolean} Whether to build the `404` page.
  **Default:** `true`.
- `showReadingTime` {boolean} Whether to estimate each page's reading time,
  such as `1 min read`, which the site shows in the page's meta bar.
  **Default:** `false`.
- `markdown` {Object} Your own plugins for the pages. See
  [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins).

## Output

Each page is emitted as `{ data, headings, readingTime, content }`: the page's
head entry, its table of contents, the optional reading time, and the processed
content serialized to JSX code as one fragment. The page layout is not part of
the content — the `html` generator wraps each page in `<Layout>`, and assembles
composed pages, such as Node.js's `all.html`, from their parts rather than
building them a second time here.

Pages are emitted as they are built, in the order their entries arrived, the
synthetic pages last. Once every page has arrived, it also emits
`{ manifest }`, every page's head in the order the site lists them, the
synthetic pages last, so that the `html` generator can build what needs the
whole site while pages are still being built.

## Index page

`index.html` is generated when an `index` document is part of the input, and
is rendered from that document like any other page. An MDX `index` document
can render the stability overview of every module by using the built-in
`<DocumentationIndex />` component (see
[MDX pages](https://doc-kit.nodejs.org/writing-docs#mdx-pages)).
