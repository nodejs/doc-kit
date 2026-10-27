# Parsing Markdown

The `ast` stage reads your Markdown and MDX files and parses each one into a
syntax tree. Every output built from Markdown starts here, and it's where
global remark plugins run, so configure it to change which files are read or
how they're parsed.

**Stage:** `ast` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** the files in `input` · **Writes:** no files

## Usage

Any target built from Markdown runs `ast` first, once per run, so you rarely
name it. On its own it parses your inputs and writes nothing, which is a quick
way to check that your MDX pages parse and your remark plugins load:

```bash
npx doc-kit generate -t ast -i "docs/**/*.{md,mdx}"
```

A file that doesn't parse, such as an MDX page with an unclosed tag, stops the
run with the parser's error. The trees then go to the
[API entries](https://doc-kit.nodejs.org/generators/metadata) stage.

## Configuring

Options go in the `ast` section of the
[configuration file](https://doc-kit.nodejs.org/configuration), for when this
stage should read different files than the others:

```mjs displayName="doc-kit.config.mjs"
export default {
  ast: {
    input: ['docs/**/*.{md,mdx}'],
    ignore: ['docs/drafts/**'],
  },
};
```

- `input` {string[]} Glob patterns of the files to parse, relative to the
  working directory. It must be an array, even for a single pattern. Every
  file it matches is parsed as Markdown or MDX, whatever its extension.
  **Default:** from `global.input` (`--input`).
- `ignore` {string|string[]} Glob patterns of files to leave out.
  **Default:** from `global.ignore` (`--ignore`).
- `markdown` {Object} [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins)
  for this stage, run after the ones in `global.markdown`.
  - `remarkPlugins` {Array} remark plugins, each a module specifier or a
    `[specifier, options]` pair.

`ast` never turns Markdown into HTML, so `rehypePlugins` and `recmaPlugins`
listed in `ast.markdown` are ignored with a warning. Once `ast` has an `input`
of its own, `--input` no longer changes which Markdown files are parsed.

Since every file `input` matches is parsed as Markdown, keep `.js` files out of
`global.input` when a run also builds
[API links](https://doc-kit.nodejs.org/generators/api-links): give them to the
[Parsing JavaScript](https://doc-kit.nodejs.org/generators/ast-js) stage
through its own `input` instead.

## What happens to each file

1. **Its syntax is picked.** Files ending in `.mdx` are parsed as MDX, all
   others as Markdown. An `mdx: true` or `mdx: false` key in the file's
   frontmatter overrides the extension (see
   [MDX pages](https://doc-kit.nodejs.org/writing-docs#mdx-pages)). When the
   frontmatter isn't valid YAML, the extension decides.
2. **Its frontmatter becomes a metadata comment.** A `---` block at the very
   start of the file is rewritten as a `<!-- YAML -->` comment, which the API
   entries stage reads like one written by hand (see
   [Page metadata](https://doc-kit.nodejs.org/writing-docs#page-metadata)). In
   an MDX file, where HTML comments aren't valid, the block is removed before
   parsing and the comment added back as the tree's first node.
3. **Its first `Stability: N` becomes a link** to
   `documentation.html#stability-index`, the section of the Node.js docs that
   explains stability levels. On another site it only resolves when a
   `documentation.html` with a "Stability index" heading sits next to the
   page. The website's stability boxes show the level without the link, but
   outputs that keep the Markdown, such as `llms-full.txt`, keep it.
4. **It's parsed and run through the remark plugins** below.
5. **It gets its page path** (see [Page paths](#page-paths)).

## The plugin pipeline

Each Markdown file goes through these remark plugins, in order:

1. [`remark-parse`](https://github.com/remarkjs/remark/tree/main/packages/remark-parse),
   which parses the Markdown.
2. doc-kit's
   [type annotations](https://doc-kit.nodejs.org/writing-docs#types-that-link-themselves),
   which read text in curly braces, such as `{string}`, as a TypeScript type.
3. [`remark-gfm`](https://github.com/remarkjs/remark-gfm), for GitHub Flavored
   Markdown: tables, task lists, strikethrough, autolinks and footnotes.
4. The plugins in `global.markdown.remarkPlugins`.
5. The plugins in `ast.markdown.remarkPlugins`.

MDX files add [`remark-mdx`](https://mdxjs.com/packages/remark-mdx/) before
these and skip the type annotations, since curly braces are JavaScript
expressions in MDX. A plugin can tell which kind of file it's processing from
`this.data('mdx')`.

Each plugin runs on the whole document and receives its file, whose
`file.path` is the path `input` matched, such as `docs/guide/install.md`.
Because global remark plugins run here, every output sees their changes, and
`jsx-ast`, which builds the website's pages, doesn't run them again.
[Where plugins run](https://doc-kit.nodejs.org/configuration#where-plugins-run)
lists the other generators that load them.

## Page paths

A file's page path is its path relative to the base of the pattern that
matched it (the directories before the first wildcard), without its extension.
With `docs/**/*.md`, `docs/guide/install.md` becomes `/guide/install`, which
the [website](https://doc-kit.nodejs.org/generators/html) writes as
`guide/install.html`.

Each pattern is matched on its own, so keep them from overlapping:

- A file that two patterns match is parsed twice, and appears twice in every
  output.
- Patterns with different bases can give two files the same path:
  `docs/index.md` and `api/index.md` are both `/index`.

## Worker threads

`ast` parses files in chunks of `chunkSize` files, spread across `threads`
worker threads (see
[Execution options](https://doc-kit.nodejs.org/configuration#execution-options)).
With `threads: 1`, or with two files or fewer, it parses them on the main
thread instead. Each worker imports the remark plugins itself, which is why
plugins are listed as module specifiers rather than imported functions.

## What it produces

A [generator of your own](https://doc-kit.nodejs.org/creating-generators#input-and-output)
with `dependsOn: '@doc-kit/core/ast'` receives every file in one array, each
as an object with:

- `tree` {Object} The file's [mdast](https://github.com/syntax-tree/mdast)
  syntax tree (a `Root` node), after every plugin ran.
- `path` {string} Its page path, such as `/guide/install`.
- `mdx` {boolean} Whether it was parsed as MDX.

Files arrive in the order their chunks finish, not the order of `input`. Most
generators depend on `@doc-kit/core/metadata` instead, to get the API entries
built from these trees.
