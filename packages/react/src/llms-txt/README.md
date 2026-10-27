# llms.txt

The `llms-txt` generator writes an [`llms.txt`](https://llmstxt.org/) file: a
Markdown index of your docs that links to each page with a one-line
description, so language models and AI tools can find their way around. Add it
when you publish your docs on the web.

This page also covers [llms-full.txt](#llms-fulltxt) (`llms-txt-full`), which
puts the Markdown of every page in one file.

**Target:** `llms-txt` · **Package:** [`@doc-kit/generator-react`](https://doc-kit.nodejs.org/packages/react) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** `llms.txt`

## Usage

The links in `llms.txt` are absolute URLs, so set `baseURL` to where your docs
are published. There is no flag for it, so set it in your configuration file:

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    baseURL: 'https://example.com',
  },
};
```

```bash
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
npx doc-kit generate -t llms-txt -i "docs/**/*.md" -o out
```

For a project named `my-lib` with `docs/index.md` and `docs/guide/usage.md`,
this writes:

```text displayName="out/llms.txt"
# my-lib Documentation

> API documentation for my-lib.

Below are the sections of the API documentation. Look out especially towards the links that point towards guidance/introduction to the structure of this documentation.

## API Documentations
- [Usage](https://example.com/guide/usage.md): How to call my-lib from your code.
- [My library](https://example.com/index.md): A small library for working with strings.
```

> [!WARNING]
> Without a `baseURL`, the links keep a literal `{baseURL}` (for example
> `{baseURL}/guide/usage.md`), and nothing warns you about it.

## Configuring

Options go in the `llms-txt` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  'llms-txt': {
    templatePath: join(import.meta.dirname, 'llms-template.txt'),
    pageURL: '{baseURL}/docs{path}.md',
  },
};
```

- `templatePath` {string} The text file `llms.txt` starts with (see
  [The template](#the-template)). A relative path resolves against the
  directory you run doc-kit from. **Default:** the bundled `template.txt`.
- `pageURL` {string} URL template for each page's link. `{path}` is the page's
  path, without its extension and starting with a slash. **Default:**
  `'{baseURL}{path}.md'`.
- `output` {string} The directory to write `llms.txt` to. Without one, nothing
  is written. **Default:** from `global.output` (`--output`).

Like every generator section, it can also override a global option, such as
`baseURL` or `project`, for this generator alone.

## What it lists

`llms.txt` has one line for each top-level (`#`) heading in your sources, as
`- [Heading](URL): Description`:

- **Heading** is the heading's text. A page without a `#` heading isn't listed,
  and a page with several gets a line for each.
- **URL** is `pageURL` filled in for the page. `{path}` is the source file's
  path relative to the base of the input glob: with `-i "docs/**/*.md"`,
  `docs/guide/usage.md` becomes `/guide/usage`.
- **Description** is the page's `llm_description` when it has one. Otherwise
  it's the first paragraph between the heading and the next heading, on one
  line: inline code, bold and italics keep their Markdown, and links become
  plain text. Without such a paragraph, it's empty.

If your opening paragraph doesn't make a good summary on its own, write one for
models with the
[`llm_description` directive](https://doc-kit.nodejs.org/specification#624-llm_description),
right after the heading it describes:

```markdown displayName="docs/guide/usage.md"
# Usage

<!-- llm_description=How to call my-lib from your code. -->
```

[Section pages](https://doc-kit.nodejs.org/generators/section-pages) aren't
listed: `llms.txt` links to the full pages.

## The template

`llms.txt` is the template's text followed directly by the list of links, so
end the template with a newline. This is the default:

```text displayName="template.txt"
# {project} Documentation

> API documentation for {project}.

Below are the sections of the API documentation. Look out especially towards the links that point towards guidance/introduction to the structure of this documentation.

## API Documentations
```

The format at [llmstxt.org](https://llmstxt.org/) expects a `#` title with
your project's name, then a `>` summary, then `##` sections of links. A
template of your own can describe your project better and add links of its own
above the generated list.

Placeholders take the value of that option from the generator's configuration,
which includes every global option:

| Placeholder    | Value                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `{project}`    | `project`: the `name` in your `package.json`, unless you set it                                     |
| `{version}`    | `version` (`--version`): the Node.js version running doc-kit, unless you set your project's version |
| `{repository}` | `repository`, as `owner/name`                                                                       |
| `{baseURL}`    | `baseURL`                                                                                           |
| `{ref}`        | `ref` (`--git-ref`): `HEAD` unless you set it                                                       |

A placeholder without a value is left as written. To use a fallback instead,
write `{name|fallback}`, where the fallback is a single word (letters, digits
and underscores). The same placeholders work in `pageURL`, along with
`{path}`.

## Serving pages as Markdown

The default `pageURL` links to a `.md` file at each page's path
(`/guide/usage.md` next to `/guide/usage.html`), as llmstxt.org proposes,
since Markdown is easier for language models to read than HTML. doc-kit
doesn't write those files, so copy your sources into the output. With the
[website](https://doc-kit.nodejs.org/generators/html), its `pathsToCopy` option
does it:

```js displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'llms-txt'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
    baseURL: 'https://example.com',
  },
  html: {
    // Copies the contents of docs/ into out/
    pathsToCopy: ['public', { docs: '.' }],
  },
};
```

Setting `pathsToCopy` replaces its default list (`assets`, `public` and
`static`), so keep the ones you use, as `public` is kept here. doc-kit's own
site builds its [`llms.txt`](https://doc-kit.nodejs.org/llms.txt) this way.
If you don't serve Markdown, link to the HTML pages instead with
`pageURL: '{baseURL}{path}.html'`.

## llms-full.txt

The `llms-txt-full` generator writes the Markdown of every page into one
`llms-full.txt` file, each page after its URL, so a language model can read
all of your docs in a single request. Pair it with `llms.txt`, which only
links to each page.

**Target:** `llms-txt-full` · **Package:** [`@doc-kit/generator-react`](https://doc-kit.nodejs.org/packages/react) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** `llms-full.txt`

### Using llms-full.txt

Set `global.baseURL` as for [`llms.txt`](#usage), since each page's URL starts
with it, then run:

```bash
npx doc-kit generate -t llms-txt -t llms-txt-full -i "docs/**/*.md" -o out
```

### Configuring llms-full.txt

Options go in the `llms-txt-full` section of the configuration file:

- `pageURL` {string} URL template written before each page. `{path}` is the
  page's extensionless path, starting with a slash (`/fs`), and any other
  option of the generator, global ones included, can be used too, such as
  `{baseURL}` or `{project}`. It's set apart from `llms-txt.pageURL`, which
  has the same default. **Default:** `'{baseURL}{path}.md'`.
- `output` {string} The directory to write `llms-full.txt` to. Without one,
  nothing is written. **Default:** from `global.output` (`--output`).
- `markdown` {Object} [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins)
  for this generator, added after the global ones.
  - `remarkPlugins` {Array} Plugins of the processor that writes each page
    back to Markdown. Pages are only serialized here, so these plugins change
    how the Markdown is written (`remark-stringify` settings, syntax
    extensions), not the content: their transforms don't run.

The default URLs point at each page's Markdown file, which none of the
built-in generators write: copy your sources into the output, as in
[Serving pages as Markdown](#serving-pages-as-markdown), or set `pageURL` to
`'{baseURL}{path}.html'` to point at the website's pages.

### What the file holds

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
