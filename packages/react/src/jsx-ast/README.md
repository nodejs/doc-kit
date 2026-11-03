# `jsx-ast` Generator

The `jsx-ast` generator converts MDAST (Markdown Abstract Syntax Tree) to JSX AST, transforming API documentation metadata into React-compatible JSX representations.

## Configuring

- `ref` {string} Git reference/branch for linking to source files.
  **Default:** `'main'`.
- `index` {Array} Array of `{ section, api }` objects defining the
  documentation structure.
- `generateNotFoundPage` {boolean} When `true`, creates a synthetic JSX AST
  entry for `404.html`. **Default:** `true`.
- `showReadingTime` {boolean} When `true`, computes an estimated reading time
  for each page and displays it in the MetaBar. **Default:** `false`.

## Output

Each page is emitted as `{ data, headings, readingTime, content }`: the page's
head entry, its table of contents, the optional reading time, and the processed
content serialized to JSX code as one fragment. The page layout is not part of
the content — the `html` generator wraps each page in `<Layout>`, and assembles
pages made of other pages' content, such as Node.js's `all.html`, rather than
building them a second time here.

Pages are emitted as they are built, in the order their entries arrived, the
synthetic pages last. Once every page has arrived, it also emits
`{ manifest }`, every page's head in that same order, so that the `html`
generator can build what needs the whole site while pages are still being
built.

To list the pages as the site does, leave out the `{ manifest }` item and sort
the pages by their head with `headingSortFn`, from
`@doc-kit/generator-react/jsx-ast/utils/getSortedHeadNodes`, as
`pages.toSorted((a, b) => headingSortFn(a.data, b.data))`, keeping the
synthetic pages (`data.synthetic`) last.

## Index page

`index.html` is generated when an `index` document is part of the input, and
is rendered from that document like any other page. An MDX `index` document
can render the stability overview of every module by using the built-in
`<DocumentationIndex />` component (see the `html` generator's README).
