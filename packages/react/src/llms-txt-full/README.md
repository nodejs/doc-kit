# llms-full.txt

The `llms-txt-full` generator writes the Markdown of every page into one
`llms-full.txt` file, each page after its URL, so a language model can read
all of your docs in a single request. Pair it with
[`llms.txt`](https://doc-kit.nodejs.org/generators/llms-txt), which only links
to each page.

## Usage

Each page's URL starts with `baseURL`, so set it to where your docs are
published. There is no flag for it, so set it in your configuration file.

```bash
npx @doc-kit/cli generate -t llms-txt -t llms-txt-full -i "docs/**/*.md" -o out
```

This writes `out/llms.txt` and `out/llms-full.txt`.

## Configuring

- `pageURL` {string} URL template written before each page. `{path}` is the
  page's extensionless path, starting with a slash (`/fs`); see
  [templates](https://doc-kit.nodejs.org/configuration#generator-options).
  It's set apart from `llms-txt.pageURL`, which has the same default.
  **Default:** `'{baseURL}{path}.md'`.
- `markdown` {Object} Its own remark plugins. See
  [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins).

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options).

The default URLs point at each page's Markdown file, which none of the
built-in generators write: copy your sources into the output, as in
[Serving pages as Markdown](https://doc-kit.nodejs.org/generators/llms-txt#serving-pages-as-markdown),
or set `pageURL` to `'{baseURL}{path}.html'` to point at the website's pages.

## What the file holds

Every page read from your sources, one after another. Each starts with a `url`
block between `---` lines, built from `pageURL`, followed by the page's
Markdown. For this page and a `path.md` next to it:

```md displayName="docs/fs.md"
# File system

<!-- YAML
added: v1.0.0
-->

The `fs` module reads and writes files. Paths can be built with
[`path.join()`][join].

### `fs.readFile(path)`

- `path` {string|URL} The file to read.
- Returns: {Promise<Buffer>}

[join]: ./path.md#pathjoinparts
```

`llms-full.txt` holds:

```text displayName="out/llms-full.txt"
---
url: https://docs.example.com/fs.md
---
# File system

The `fs` module reads and writes files. Paths can be built with
[`path.join()`](./path.html#pathjoinparts).

### `fs.readFile(path)`

* `path` {string | URL} The file to read.
* Returns: {Promise<Buffer>}

---
url: https://docs.example.com/path.md
---
# Path

### `path.join(...parts)`

Joins path segments.
```

The Markdown is rebuilt from the
[API entries](https://doc-kit.nodejs.org/generators/metadata), not copied from
your files, so it differs from the sources in a few ways:

- Links to `.md` files point to the `.html` pages.
- Reference-style links become inline links, and their definitions are
  dropped.
- Formatting is normalized: bullet lists and emphasis use `*`, strong text
  uses `**`, and a page without a heading starts with an empty `#`.
- `<!-- YAML -->` comments are left out.
- Type annotations are rewritten with spaces around `|` (`{string|URL}`
  becomes `{string | URL}`). MDX pages keep their JSX.
