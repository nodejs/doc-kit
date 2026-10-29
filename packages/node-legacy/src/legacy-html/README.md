# Legacy HTML

The `legacy-html` generator writes Node.js's legacy HTML format: the API docs
as the classic nodejs.org pages that Node.js's original documentation tooling
built, one per source file, with the same template, anchors and stylesheet.
It exists for Node.js; for a site of your own, use the
[website](https://doc-kit.nodejs.org/generators/html) generator.

## Usage

The pages link to their source on GitHub and to their other versions on your
site, so set `repository` and `baseURL` under `global` in your configuration
file, or extend the [Node.js preset](https://doc-kit.nodejs.org/packages/node),
which sets them, along with `changelog`, for Node.js. Then, from the root of a
Node.js checkout:

```bash
npx @doc-kit/cli generate -t legacy-html -i "doc/api/*.md" -o out \
  --index doc/api/index.md --changelog CHANGELOG.md --version 24.1.0
```

This writes a page per source file, named after its `api` identifier
(`doc/api/fs.md` becomes `out/fs.html`), and copies the stylesheet, script and
icons the pages load into `out/assets/`. Pages are written side by side
whatever directory their source is in, so `guide/usage.md` becomes
`guide-usage.html`, which links to `guide/usage.md` miss. Keep your sources in
one flat directory, as Node.js's `doc/api/` is.

Each page's header also links to `all.html` and to its JSON file, such as
`fs.json`. Build them into the same directory with
[`legacy-html-all`](https://doc-kit.nodejs.org/generators/legacy-html-all) and
[`legacy-json`](https://doc-kit.nodejs.org/generators/legacy-json).

## Configuring

- `ref` {string} The Git ref that the source links and the "Edit on GitHub"
  link point at. **Default:** `'main'`, which wins over `global.ref`, so
  `--git-ref` doesn't change it: set it here.
- `pageURL` {string} URL template for each release in the "Other versions"
  picker. `{version}` is the release line, such as `v22.x`, and `{path}` is the
  page's path (`/fs`); see
  [templates](https://doc-kit.nodejs.org/configuration#generator-options).
  **Default:** `'{baseURL}/latest-{version}/api{path}.html'`.
- `editURL` {string} URL template for the "Edit on GitHub" link, with the same
  placeholders. **Default:**
  `'https://github.com/{repository}/edit/{ref}/doc/api{path}.md'`.
- `templatePath` {string} The HTML template each page is written into (see
  [The template](#the-template)). **Default:** the bundled `template.html`.
- `additionalPathsToCopy` {string[]} Directories to copy into the output, each
  under its own name. Setting it replaces the default. **Default:** the bundled
  `assets` directory.

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options):
`changelog` sets the releases the "Other versions" picker lists, and `index`
the sidebar's order (without one, pages are listed by title, alphabetically).

The pages render Markdown with a fixed set of plugins, so a `markdown` section
for this generator is ignored with a warning.
[Global remark plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins)
still change the entries it reads.

## What a page holds

Each page fills the template with its title, a table of contents of its
headings down to level 5, the sidebar, and its content, in which:

- Each heading has a `#` link to its anchor, and a second anchor with the slug
  the original tooling gave it (`fs_fs_readfile_path_options_callback`), so old
  links still land on it.
- Each section's metadata becomes a line under its heading: a "Source Code"
  link from `source_link`, the versions it was added, deprecated or removed
  in, its N-API version, and a collapsed "History" table of its `changes`.
- Stability indexes become colored boxes, and their level also colors the
  heading's entry in the table of contents.
- A `<!-- STABILITY_OVERVIEW_SLOT_BEGIN -->` comment adds a table of the
  stability of every page that has one, as in Node.js's `documentation.md`.
- Code blocks are highlighted.
- In MDX sources, JSX elements render as their children, and expressions are
  left out.

## The template

The bundled template is the Node.js one: its title, canonical URL, logo and
links are nodejs.org's. To change them, copy it and set `templatePath`. The
generator replaces these placeholders:

| Placeholder              | Replaced with                                                            |
| ------------------------ | ------------------------------------------------------------------------ |
| `__SECTION__`            | The page's title: its first heading, or its `api` capitalized.           |
| `__VERSION__`            | `version` with a `v`, such as `v24.1.0`.                                 |
| `__FILENAME__`, `__ID__` | The page's `api` identifier, such as `fs`.                               |
| `__TOC__`                | The table of contents, in a `<details id="toc">`.                        |
| `__TOC_PICKER__`         | The table of contents again, as the header's "Table of contents" picker. |
| `__GTOC__`               | The sidebar, linking to every page.                                      |
| `__GTOC_PICKER__`        | The sidebar again, as the header's "Index" picker.                       |
| `__ALTDOCS__`            | The "Other versions" picker.                                             |
| `__EDIT_ON_GITHUB__`     | The "Edit on GitHub" link, from `editURL`.                               |
| `__CONTENT__`            | The page's content.                                                      |

`__ID__`, `__SECTION__`, `__CONTENT__`, `__ALTDOCS__` and `__EDIT_ON_GITHUB__`
are replaced where they first appear only; the others, everywhere.
