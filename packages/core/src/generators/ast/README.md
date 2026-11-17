# Parsing Markdown

The `ast` stage reads your Markdown and MDX files and parses each one into a
syntax tree. Every output built from Markdown starts here, and it's where
global remark plugins run. Any target built from Markdown runs it first, once
per run, so you rarely name it. The trees then go to the
[API entries](https://doc-kit.nodejs.org/generators/metadata) stage.

## Configuring

`ast` has no options of its own. It parses the files `input` matches, minus
those `ignore` matches (see
[Global options](https://doc-kit.nodejs.org/configuration#global-options)).
Set them in an `ast` section for this stage to read different files than the
others. It runs the remark plugins in `global.markdown` and `ast.markdown`;
see [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins).

Files ending in `.mdx` are parsed as MDX, all others as Markdown, unless the
file's frontmatter sets `mdx` (see
[MDX pages](https://doc-kit.nodejs.org/writing-docs#mdx-pages)).

## Page paths

A file's page path is its path relative to the base of the pattern that
matched it (the directories before the first wildcard), without its extension.
With `docs/**/*.md`, `docs/guide/install.md` becomes `/guide/install`, which
the [website](https://doc-kit.nodejs.org/generators/html) writes as
`guide/install.html`.

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
