# Legacy single-page HTML

The `legacy-html-all` generator writes `all.html`, the page of Node.js's
legacy HTML format that holds all the others, one after another. Every legacy
page links to it as "View on single page". It exists for Node.js; the
[website](https://doc-kit.nodejs.org/generators/html) generator writes an
`all.html` of its own.

## Usage

From the root of a Node.js checkout, with `repository` and `baseURL` set as
for [Legacy HTML](https://doc-kit.nodejs.org/generators/legacy-html#usage):

```bash
npx @doc-kit/cli generate -t legacy-html-all -i "doc/api/*.md" -o out \
  --index doc/api/index.md --changelog CHANGELOG.md --version 24.1.0
```

This writes `out/all.html`. `legacy-html` runs first without being listed, and
writes its pages and `assets/` to the same directory, which `all.html` needs:
it loads its stylesheet from `assets/` and links to the pages in its sidebar.

## Configuring

- `templatePath` {string} The HTML template the page is written into, with the
  placeholders of
  [the `legacy-html` template](https://doc-kit.nodejs.org/generators/legacy-html#the-template).
  Setting `legacy-html.templatePath` doesn't change it, so set both to use
  your own. **Default:** the bundled `template.html`.

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options). The
page's version and its "Other versions" picker come from `version` and
`changelog`, as on the other pages, and the picker's links from
`legacy-html.pageURL`.

## What the page holds

The template, filled as for the other pages, with:

- `all` as the file name and `All` as the title.
- Every page's table of contents and content, one after another, except
  those of the top-level `index.md`.
- A sidebar linking to each of those pages.
- No "Edit on GitHub" link and no "Index" picker.
