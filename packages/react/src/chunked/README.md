# `chunked` Generator

The `chunked` generator splits every documented module into per-section pages.
It leaves the full module page untouched and adds one extra page for each
section next to it:

```text
out/
├── fs.html                  the complete module page, exactly as before
└── fs/
    ├── promises-api.html    ## Promises API
    ├── FileHandle.html      ### Class: FileHandle, with all of its members
    ├── fsPromises.readFile.html
    ├── callback-api.html    ## Callback API
    ├── readFile.html        ### fs.readFile(path[, options], callback)
    └── ...
```

Each chunk page renders like any other page: same layout, sidebar, table of
contents, and search. On top of that:

- the sidebar nests the current module's sections under its entry (the module
  itself is repeated as the first item, so the full page stays one click away);
- previous/next links step through the module and its sections in order;
- the meta bar links a chunk back to its place on the full page ("Part Of"),
  and its "View As" and "Edit this page" links point at the module's files;
- links inside a section keep working: fragment links follow the section they
  point at to whichever page it landed on, and relative links are re-based.

```bash
npx @doc-kit/cli generate -t chunked -i "doc/api/*.md" -o out
```

## How it works

`chunked` does not render anything itself. It consumes the `metadata`
generator's entries, and for each module appends copies of the entries of every
section, re-homed under the section's own `api` and `path` (`fs/readFile`).
It then declares the generators it is delivered through as its
[`dependent`](../../../../docs/creating-generators.md#declaring-a-dependent)s:

- `html`, where it is spliced between `metadata` and `jsx-ast`, so the web
  generators render the chunk pages as if they had always been there;
- `sitemap`, where it is spliced in front of the generator itself, so the
  chunk pages are listed.

```text
ast → metadata → chunked → jsx-ast → html
               └─────────→ sitemap
```

Requesting `-t chunked` on its own therefore produces both. Requested together
with either of them (`-t html -t chunked`), it only feeds the ones that run.

Other generators that read `metadata` — `orama-db`, `llms-txt`, and the JSON
outputs — are deliberately left alone: search results and `llms.txt` keep
pointing at the full pages, which carry the same anchors, and nothing is
indexed twice.

## What becomes a chunk

Within a module, a new chunk starts at:

- every depth-2 heading (`## Callback API`, `## Notes`), and
- every heading up to `maxDepth` that documents an API entry — a method, class,
  constructor, event, property, static method, or global (`### fs.readFile()`).

Everything else stays in the chunk of the closest heading above it: prose
sub-sections (`#### File descriptors`), and — regardless of depth — the members
of a class, so that a class page lists its whole API (`### Class: fs.Dir` keeps
`#### dir.close()`).

A section only becomes a chunk when it documents an API entry — its own
heading, or one nested anywhere below it, is a method, class, constructor,
event, property, or static method. Pure prose (`## Introduction`, `## Notes`,
the whole of "About this documentation") reads best in the context of the full
page, and stays there. A prose-headed section whose sub-sections are API
entries (`## Callback API`) is still a chunk, so that the sidebar can nest them
under it.

The module's own introduction (everything before the first depth-2 heading) is
only on the full page. Modules that would yield fewer than two chunks — which
includes every module that documents no API at all — and modules listed in
`exclude`, are left alone.

## File names

A chunk's file name comes from its heading. API names keep their case, with the
module's own prefix dropped, so `fs.readFile()` becomes `fs/readFile.html` and
`Class: fs.Dir` becomes `fs/Dir.html`; names in another namespace keep it
(`fs/fsPromises.readFile.html`). Prose headings are slugged
(`fs/callback-api.html`). Duplicates within a module are suffixed
(`close.html`, `close-2.html`), comparing case-insensitively so the output is
safe on case-insensitive file systems.

Heading anchors are unchanged, so `fs/readFile.html#fsreadfilepath-options-callback`
and `fs.html#fsreadfilepath-options-callback` point at the same section.

## Configuring

- `maxDepth` {number} The deepest heading level that may start a chunk.
  Headings below it always stay with the section above them. **Default:** `2`,
  which only splits at `##` headings; the tree above is what `3` produces.
- `exclude` {Array} `api` names of modules that are never split, on top of the
  modules that document no API entry. **Default:** `[]`.

```js
// doc-kit.config.mjs
export default {
  target: ['chunked'],
  chunked: {
    // Also split at `###` headings that document an API entry
    maxDepth: 3,
    exclude: ['deprecations'],
  },
};
```

## Chunk metadata

Every entry of a chunk page carries a `chunk` property describing its origin,
which the `html` UI uses for its navigation:

- `api` {string} The `api` of the module the chunk was split from (`fs`).
- `path` {string} The `path` of the module (`/fs`).
- `slug` {string} The section's anchor on the full page.
- `index` {number} The chunk's position within the module, in document order.
- `depth` {number} The original depth of the chunk's heading.

The chunk's first entry also gets a `title` — its sidebar label and page
title (`fs.readFile`). The `html` generator exposes every module's section
tree through the `chunks` export of
[`#theme/config`](./html.md#themeconfig-virtual-module), for custom themes.

## Trade-offs

- Chunk pages duplicate content that is also on the full page, so the site
  roughly doubles in page count and the build grows accordingly.
- No redirects are generated from `fs.html#anchor` to a chunk page: the full
  page still exists, so existing links keep working, and both pages share
  their anchors.
- Chunk pages do not get `.json` or `.md` renderings of their own; their
  "View As" links lead to the module's.
