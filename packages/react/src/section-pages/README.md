# Section pages

The `section-pages` generator adds a page for each section of every module,
next to the full module page, so readers can open a single class or method on
its own. Use it when your modules are long reference pages.

## Usage

```bash
npx @doc-kit/cli generate -t section-pages -i "doc/api/*.md" -o out
```

Every module keeps its full page (`fs.html`) and gets one page per section in
a directory of its own (`fs/callback-api.html`). The full page keeps its
content; only its sidebar and previous/next links change to include the
section pages. What the run writes depends on the targets you pass with
`section-pages`:

| You request                   | You get                                                |
| ----------------------------- | ------------------------------------------------------ |
| `-t section-pages`            | The website and `sitemap.xml`, both with section pages |
| `-t html -t section-pages`    | The website only                                       |
| `-t sitemap -t section-pages` | `sitemap.xml` only                                     |

> [!IMPORTANT]
> The [sitemap](https://doc-kit.nodejs.org/generators/sitemap) lists absolute
> URLs, so set `baseURL` in your configuration file whenever the run includes
> it.

## Configuring

```mjs displayName="doc-kit.config.mjs"
export default {
  target: ['section-pages'],
  'section-pages': {
    // Also split at `###` headings that document an API entry
    maxDepth: 3,
    exclude: ['deprecations'],
  },
};
```

- `maxDepth` {number} The deepest heading level that can start a section
  page: `##` headings can, and so can classes, methods, events and globals
  from `###` down to this level. Values below `2` split nothing.
  **Default:** `2`.
- `exclude` {string[]} Modules never to split, by their `api` name (`fs` for
  `fs.md`). **Default:** `[]`.

With this configuration, Node.js's `fs.md` comes out as:

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

## What gets its own page

Within a module, a new section page starts at:

- every `##` heading, and
- every heading from `###` down to `maxDepth` that is a class, method, event or
  global (an entry marked `type: global`), such as `### fs.readFile()`.

Everything else stays on the page of the closest heading above it:

- prose sub-sections below `##`, such as `#### File descriptors`;
- constructors, properties and static methods below `##`;
- at any depth, the members of a class, so a class page lists its whole API
  (`### Class: fs.Dir` keeps `#### dir.close()`).

A section only gets a page when it documents an API entry, in its own heading
or any heading below it. Pure prose (`## Introduction`, `## Notes`) reads best
in the context of the full page and stays there. A prose heading whose
sub-sections are API entries (`## Callback API`) still gets a page, so the
sidebar can nest them under it.

The module's introduction, everything before the first heading that starts a
page, is only on the full page. A module isn't split when it would get fewer
than two section pages (which includes every module that documents no API
entry), when it's listed in `exclude`, or when it has no `#` heading.

## File names

A section page's file name comes from its heading:

- API names keep their case and drop the module's own prefix: `fs.readFile()`
  becomes `fs/readFile.html`, and `Class: fs.Dir` becomes `fs/Dir.html`.
- Names from another namespace keep it: `fs/fsPromises.readFile.html`.
- Prose headings, and API names that aren't safe file names, are slugged:
  `fs/callback-api.html`.
- A name repeated within a module gets a number (`close.html`,
  `close-2.html`). The comparison ignores case, so the output is safe on
  case-insensitive file systems.

Heading anchors don't change, so
`fs/readFile.html#fsreadfilepath-options-callback` and
`fs.html#fsreadfilepath-options-callback` point at the same section.

## On a section page

A section page renders like any other page, with the same layout, sidebar,
table of contents and search. The section's heading becomes the page's main
heading, and its sub-headings move up with it. Also:

- **Sidebar:** while you view a split module or one of its section pages, the
  module's entry expands into its sections, nested by heading level, with the
  module repeated as the first item.
- **Previous and next:** on a split module and its section pages, the links
  step through the module page and its section pages in document order,
  instead of the sidebar order.
- **Meta bar:** "Part Of" links back to the section's place on the full page.
  "View As", "Edit this page" and the version picker point at the module's
  files and pages. "Added In" shows the section's own version, falling back to
  the module's.
- **Links:** a fragment link follows its section to whichever page it ended up
  on (anchors in the module's introduction point at the full page). Relative
  links, including type links, are re-based so they still resolve from the
  section page's directory. Absolute URLs don't change.

## Data for custom themes

Every entry on a section page carries a `chunk` property that describes where
it came from:

- `api` {string} The module's `api` (`fs`).
- `path` {string} The module's `path` (`/fs`).
- `slug` {string} The section's anchor on the full page.
- `index` {number} The section's position within the module, in document
  order.
- `depth` {number} The level of the section's heading on the full page.

The entry's own `api`, `path` and `basename` are the section page's
(`fs-readFile`, `/fs/readFile`, `readFile`). The first entry also gets a
`title`, used as the page title and sidebar label (`fs.readFile`).

Theme components receive this as `metadata.chunk`. The `chunks` export of
[`#theme/config`](https://doc-kit.nodejs.org/generators/html#theme-config-module)
maps each split module's path to its label and section tree, which the
built-in sidebar and previous/next links use.

## How it works

`section-pages` doesn't render anything itself. It reads the API entries,
keeps them all, and appends a copy of each section's entries for every module,
re-homed under the section page's own `api` and `path`. It names `html` and
`sitemap` as its
[dependents](https://doc-kit.nodejs.org/creating-generators#declaring-a-dependent),
so the pipeline splices it in where each of them reads `metadata`:

- in the `html` pipeline, between `metadata` and
  [`jsx-ast`](https://doc-kit.nodejs.org/generators/jsx-ast), so the website
  renders the section pages like any other;
- directly in front of `sitemap`, so the section pages are listed.

No other generator sees the section pages. The search index, `llms.txt` and
the JSON outputs read `metadata` directly, so they keep pointing at the full
pages (which carry the same anchors) and nothing is indexed twice.

## Trade-offs

- Section pages repeat content that's also on the full page, so the site has
  more pages and takes longer to build.
- No redirects are generated from `fs.html#anchor` to a section page. The full
  page still exists, so existing links keep working.
- Section pages don't get `.json` or `.md` renderings of their own; their
  "View As" links lead to the module's.
- Section pages stay out of the sidebar's page list (they only appear nested
  under the module you're viewing) and out of `all.html`.
