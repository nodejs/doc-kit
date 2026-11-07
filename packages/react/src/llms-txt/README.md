# llms.txt

The `llms-txt` generator writes an [`llms.txt`](https://llmstxt.org/) file: a
Markdown index of your docs that links to each page with a one-line
description, so language models and AI tools can find their way around. Add it
when you publish your docs on the web.

To hand models the Markdown of every page in one file as well, add
[llms-full.txt](https://doc-kit.nodejs.org/generators/llms-txt-full)
(`llms-txt-full`).

## Usage

The links in `llms.txt` are absolute URLs, so set `baseURL` to where your docs
are published. There is no flag for it, so set it in your configuration file.

```bash
npx @doc-kit/cli generate -t llms-txt -i "docs/**/*.md" -o out
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

## Configuring

- `templatePath` {string} The text file `llms.txt` starts with (see
  [The template](#the-template)). A relative path resolves against the
  directory you run doc-kit from. **Default:** the bundled `template.txt`.
- `pageURL` {string} URL template for each page's link. `{path}` is the page's
  path, without its extension and starting with a slash; see
  [templates](https://doc-kit.nodejs.org/configuration#generator-options).
  **Default:** `'{baseURL}{path}.md'`.

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options).

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

Placeholders such as `{project}` take configuration values; see
[templates](https://doc-kit.nodejs.org/configuration#generator-options).

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
