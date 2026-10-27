# JSON

The `json` generator writes each source file as a JSON document: a tree of
its headings, each with its metadata, signature or type, Markdown and code
examples, in a format a published JSON schema describes. Use it when a program
needs your API as data, such as an editor integration, a linter or a site of
your own.

This page also covers the [JSON bundle](#json-bundle) (`json-all`), which puts
every document in one file, and [Debug JSON](#debug-json) (`json-simple`), a
dump of the API entries for debugging the pipeline.

**Target:** `json` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** one `.json` file per source file

## Usage

`@doc-kit/core` comes with the CLI, so there's nothing else to install:

```bash
npx doc-kit generate -t json -i "doc/api/**/*.md" -o out
```

The documents keep the input's directory layout, from where the glob starts:
`doc/api/fs.md` becomes `out/fs.json`, and `doc/api/guides/streams.md` becomes
`out/guides/streams.json`.

## Configuring

Options go in the `json` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    repository: 'nodejs/node',
    ref: 'main',
  },
  json: {
    minify: true,
  },
};
```

- `output` {string} The directory to write the documents to. Without one,
  nothing is written, and the documents only go to the generators that read
  them, such as the JSON bundle. **Default:** from `global.output`
  (`--output`).
- `minify` {boolean} Write the documents without indentation.
  **Default:** `false`, from `global.minify` (`--minify`).
- `repository` {string} The GitHub repository, as `owner/name`, that
  `sourceLink.url` points into. Without one, `sourceLink.url` is `null`.
  **Default:** from `global.repository`.
- `ref` {string} The Git ref `sourceLink.url` points at. **Default:**
  `'HEAD'`, from `global.ref` (`--git-ref`).
- `schemaURL` {string} The URL every document carries in `$schema`.
  `{schemaVersion}` is the schema's version, and other placeholders, such as
  `{repository}`, take configuration values. **Default:**
  `'https://doc-kit.nodejs.org/schemas/api-doc/{schemaVersion}.json'`.
- `markdown` {Object} [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins)
  for this generator, added after the ones in `global.markdown`.
  - `remarkPlugins` {Array} Plugins for writing descriptions back to Markdown.
    Only what they add to the serializer applies, such as a handler for a node
    type: their transforms don't run, since the sources were already parsed.

## The document

```json displayName="out/fs.json"
{
  "$schema": "https://doc-kit.nodejs.org/schemas/api-doc/1.0.1.json",
  "id": "fs",
  "path": "/fs",
  "type": "module",
  "module": "fs",
  "title": "File system",
  "introducedIn": "v0.10.0",
  "sourceLink": {
    "path": "lib/fs.js",
    "url": "https://github.com/nodejs/node/blob/main/lib/fs.js"
  },
  "stability": { "index": "2", "description": "Stable" },
  "added": [],
  "deprecated": [],
  "removed": [],
  "napiVersion": [],
  "changes": [],
  "description": "The `node:fs` module enables interacting with the file system in a\nway modeled on standard POSIX functions.\n\n…",
  "summary": "The `node:fs` module enables interacting with the file system in a way modeled on standard POSIX functions.",
  "examples": [],
  "children": []
}
```

A document stands for a source file and its title heading. Besides the
[fields every entry has](#fields-every-entry-has), it carries these, most from
the file's [page metadata](https://doc-kit.nodejs.org/writing-docs#page-metadata):

| Field          | Type             | Holds                                                                                                                      |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `$schema`      | `string`         | The URL of the schema the document conforms to, from `schemaURL`. Its last path segment is the schema version.             |
| `id`           | `string`         | The file's path in the input tree, slugged: `fs`, `guides-streams`.                                                        |
| `path`         | `string`         | The file's path in the input tree, without extension: `/fs`.                                                               |
| `type`         | `string`         | The file's `type=` directive: `module` (the default), `misc` or `global`.                                                  |
| `module`       | `string \| null` | The `name=` directive. Without one, the `id` of a `module` document, and `null` for the others.                            |
| `introducedIn` | `string \| null` | The `introduced_in=` directive.                                                                                            |
| `sourceLink`   | `object \| null` | The `source_link=` directive: `path`, as authored, and `url`, the file on GitHub at `ref` (`null` without a `repository`). |
| `children`     | `Node[]`         | The file's other headings, as [nodes](#nodes) nested by depth, in document order.                                          |

### Fields every entry has

The document and every node carry:

| Field                            | Type             | Holds                                                                                                                                                                                                                                                                           |
| -------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                          | `string`         | The heading text as authored, inline Markdown included.                                                                                                                                                                                                                         |
| `stability`                      | `object \| null` | The stability index: `index`, as authored (`"1.1"`), and `description`, the Markdown after it.                                                                                                                                                                                  |
| `added`, `deprecated`, `removed` | `string[]`       | Versions, as authored.                                                                                                                                                                                                                                                          |
| `napiVersion`                    | `number[]`       | The Node-API versions the entry is available in.                                                                                                                                                                                                                                |
| `changes`                        | `object[]`       | The change history, one record per change: `versions`, `prUrl`, `commit` and `description`.                                                                                                                                                                                     |
| `description`                    | `string`         | The body as Markdown (MDX, from MDX sources): everything under the heading except its metadata, its stability index and the typed list a signature or type was taken from. Reference links are inlined, and links to `.md` files point to the `.html` pages, as on the website. |
| `summary`                        | `string`         | A one-paragraph summary: the `llm_description` when there is one, else the first paragraph on one line, with links reduced to their text.                                                                                                                                       |
| `examples`                       | `object[]`       | The fenced code blocks of the body, as `language`, `displayName` and `code`. They stay in `description` too.                                                                                                                                                                    |

Every field is always present: what a source doesn't declare is `null`, an
empty string or an empty array.

## Nodes

A node is a heading below the title. Its `kind` says what the heading
documents
([how headings are classified](https://doc-kit.nodejs.org/writing-docs#how-headings-are-classified))
and decides which further fields the node has:

| `kind`         | Heading                                        | Further fields    |
| -------------- | ---------------------------------------------- | ----------------- |
| `section`      | Anything else: prose, `DEP0005: …`, `--flag`   | none              |
| `class`        | `` Class: `net.Server` ``                      | `extends`         |
| `constructor`  | `` `new Agent([options])` ``                   | `signature`       |
| `method`       | `` `fs.readFile(path[, options], callback)` `` | `signature`       |
| `staticMethod` | `` Static method: `Buffer.from(string)` ``     | `signature`       |
| `property`     | `` `buf.length` ``                             | `type`, `default` |
| `event`        | `` Event: `'close'` ``                         | `parameters`      |

Every node also carries:

| Field        | Type             | Holds                                                                                                                             |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | `string`         | The heading's slug, unique within the document. It's the heading's anchor on the website.                                         |
| `name`       | `string`         | The bare identifier: `readFile`, `Server`, `close`. A section's heading text. A `name=` directive under the heading overrides it. |
| `scope`      | `string`         | `global` for headings typed `global` and in `global` documents, `module` otherwise.                                               |
| `overloadOf` | `string \| null` | On the second and later of consecutive sibling headings documenting the same callable, the `id` of the first.                     |
| `children`   | `Node[]`         | The headings nested under this one.                                                                                               |

## Signatures and types

The further fields come from the heading and the
[typed list](https://doc-kit.nodejs.org/writing-docs#parameters-return-values-and-defaults)
under it:

| Field        | On                                       | Holds                                                                                                                                                                |
| ------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signature`  | constructors, methods and static methods | `parameters`, every parameter the heading declares, in order, and `returns`, the `Returns:` item or `null`. A parameter the list doesn't describe has a `null` type. |
| `extends`    | classes                                  | The type of the `Extends:` item, else the `extends` in the heading (`` Class: `Foo extends Bar` ``), else `null`.                                                    |
| `type`       | properties                               | The type of the `Type:` item. Its description goes first in the node's `description`.                                                                                |
| `default`    | properties                               | The default of the `Type:` item.                                                                                                                                     |
| `parameters` | events                                   | The arguments the listeners receive.                                                                                                                                 |

A parameter has a `name`, without `...`, a `type`, a `description`, and:

- `default`: the value as authored, without its code span, or `null`.
- `optional`: `true` when the parameter is bracketed in the heading or has a
  default.
- `rest`: `true` when it's declared as `...args`.
- `properties`: its nested items, such as the properties of an options object
  or the arguments of a callback, each a parameter too.

A type has `text`, the annotation as a TypeScript type on one line, with `|`
between union members, and `links`, the names in it that resolved to
documentation, with their offsets in `text`. Names resolve through the
[type map](https://doc-kit.nodejs.org/generators/metadata#type-links), then the
built-in ones; a dotted name no map has, such as `fs.Stats`, links to its
module's page (`fs.html#class-fsstats`). A type the source doesn't document is
`null`, never guessed.

For example, this method:

```markdown displayName="doc/api/fs.md"
## `fsPromises.readFile(path[, options])`

- `path` {string|URL} The file to read.
- `options` {Object}
  - `encoding` {string|null} **Default:** `null`.
- Returns: {Promise} Fulfills with the contents of the file.

Reads the entire contents of a file.
```

has `Reads the entire contents of a file.` as its `description`, and this
`signature` (each type's `links` shortened to `[]`):

```json
{
  "parameters": [
    {
      "name": "path",
      "type": { "text": "string | URL", "links": [] },
      "description": "The file to read.",
      "default": null,
      "optional": false,
      "rest": false,
      "properties": []
    },
    {
      "name": "options",
      "type": { "text": "Object", "links": [] },
      "description": "",
      "default": null,
      "optional": true,
      "rest": false,
      "properties": [
        {
          "name": "encoding",
          "type": { "text": "string | null", "links": [] },
          "description": "",
          "default": "null",
          "optional": true,
          "rest": false,
          "properties": []
        }
      ]
    }
  ],
  "returns": {
    "type": { "text": "Promise", "links": [] },
    "description": "Fulfills with the contents of the file."
  }
}
```

Each `links` array lists its type's names with where they point and their
offsets, such as
`{ "name": "URL", "href": "https://developer.mozilla.org/docs/Web/API/URL", "start": 9, "end": 12 }`
for `URL` in `string | URL`.

## Using the schema

Every document's `$schema` points to the version of the schema it conforms to,
such as `https://doc-kit.nodejs.org/schemas/api-doc/1.0.1.json`. The schema
also ships in `@doc-kit/core` as `@doc-kit/core/generators/json/schema.json`,
with TypeScript types generated from it:

```ts displayName="list-methods.ts"
import { readFile } from 'node:fs/promises';

import type {
  Document,
  Node,
} from '@doc-kit/core/generators/json/generated/schema';

const fs: Document = JSON.parse(await readFile('out/fs.json', 'utf-8'));

const listMethods = (nodes: Array<Node>): void => {
  for (const node of nodes) {
    if (node.kind === 'method') {
      console.log(
        node.name,
        node.signature.parameters.map(p => p.name)
      );
    }

    listMethods(node.children);
  }
};

listMethods(fs.children);
```

### Changing the schema

For doc-kit contributors: `schema.json` is the source of truth for the format.
When you change it, bump the version in its `$id`, in `SCHEMA_VERSION` in
`constants.mjs`, and in the `$id` of the JSON bundle's schema and its
reference to this one, all together. Then regenerate the types with
`node scripts/generate-json-types.mjs`. The tests fail while the versions
disagree or the committed types are stale.

## JSON bundle

The `json-all` generator writes every `json` document into a single
`all.json`, for tools that would rather load your whole API from one file.

**Target:** `json-all` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** `json` · **Writes:** `all.json`

### Using the bundle

```bash
npx doc-kit generate -t json-all -i "docs/**/*.md" -o out
```

This writes `out/all.json`. `json` runs first without being listed, and writes
its own files to the same directory, such as `out/getting-started.json`. To
leave those out, see [Writing only the bundle](#writing-only-the-bundle).

### Configuring the bundle

Options go in the `json-all` section of the configuration file:

```js displayName="doc-kit.config.mjs"
export default {
  'json-all': {
    minify: true,
  },
};
```

- `output` {string} The directory to write `all.json` to. Without one,
  nothing is written. **Default:** from `global.output` (`--output`).
- `minify` {boolean} Write the bundle on one line, without indentation.
  **Default:** `false`, from `global.minify` (`--minify`).
- `index` {string|Array} The path or URL of an `index.md` whose links set the
  order of the documents, or the parsed list of `{ section, api }` objects.
  See [Document order](#document-order). **Default:** from `global.index`
  (`--index`).
- `schemaURL` {string} URL template for the bundle's `$schema`.
  `{schemaVersion}` is the schema's version, and other placeholders, such as
  `{project}`, take configuration values. The documents inside keep the
  `$schema` from `json.schemaURL`. **Default:**
  `'https://doc-kit.nodejs.org/schemas/api-doc-all/{schemaVersion}.json'`.

### What the bundle holds

```json displayName="out/all.json"
{
  "$schema": "https://doc-kit.nodejs.org/schemas/api-doc-all/1.0.1.json",
  "documents": [
    {
      "$schema": "https://doc-kit.nodejs.org/schemas/api-doc/1.0.1.json",
      "id": "getting-started",
      "path": "/getting-started",
      "type": "module",
      "module": "getting-started",
      "title": "Getting started",
      "introducedIn": null,
      "sourceLink": null,
      "stability": null,
      "added": [],
      "deprecated": [],
      "removed": [],
      "napiVersion": [],
      "changes": [],
      "description": "Install the package, then run it.",
      "summary": "Install the package, then run it.",
      "examples": [],
      "children": []
    }
  ]
}
```

- `$schema` {string} The URL of the schema the bundle conforms to, from
  `schemaURL`. With the default, its file name is the schema version.
- `documents` {Array} Every `json` document, exactly as `json` writes it to its
  own file (see [The document](#the-document)), in the
  [document order](#document-order).

The bundle's schema ships as `@doc-kit/core/generators/json-all/schema.json`
and is published at the default `$schema` URL. For the documents, it refers to
the `json` schema of the same version.

### Document order

Without an index, the documents are sorted by `id`. To choose the order, pass
an `index.md` with `--index`:

```bash
npx doc-kit generate -t json-all -i "docs/**/*.md" -o out --index docs/index.md
```

The documents its links point to come first, in the order of the links, and
the rest follow by `id`:

```text displayName="docs/index.md"
# My library

* [Getting started](getting-started.md)
* [Configuration](configuration.md)
```

- Only list items written with an asterisk, `* [Title](file.md)`, count.
  `- [Title](file.md)` is skipped.
- A link places the document whose `id` is the link's target without `.md`:
  `getting-started.md` matches the document of `docs/getting-started.md`.
- A file in a subdirectory, such as `docs/guide/intro.md`, has the `id`
  `guide-intro`. A link to `guide/intro.md` doesn't match it, so it's ordered
  with the rest.
- Links to files that aren't in your input are ignored.
- `index.md` is a document too when your input matches it, ordered with the
  rest. Leave it out with `--ignore docs/index.md`.

### Writing only the bundle

`json` writes its documents to its own `output`, which is `global.output`
unless you set one under `json`. To write `all.json` alone, set it to `null`;
`-o out` still sets where the bundle goes:

```js displayName="doc-kit.config.mjs"
export default {
  json: {
    output: null,
  },
};
```

> [!NOTE]
> A source file named `all.md` at the top of your input becomes `all.json` as
> well, and the bundle overwrites it. To keep both, give the bundle a directory
> of its own with `json-all.output`, such as `'out/bundle'`.

## Debug JSON

The `json-simple` generator dumps the API entries doc-kit parsed from your
sources into one JSON file. Almost every other generator reads these entries,
so when an output looks wrong, this file tells you whether the entry itself is
wrong or the generator that rendered it.

**Target:** `json-simple` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** `api-docs.json`

### Using the dump

```bash
npx doc-kit generate -t json-simple -i "docs/**/*.md" -o out
```

This writes `out/api-docs.json`. To see what another output is built from, run
`json-simple` on its own, with the same inputs as that output.

> [!WARNING]
> Don't add `json-simple` to a run that builds other targets. It removes the
> heading and the stability index from each entry's `content` in place, and
> every target in the run reads those same entries, so their output comes out
> wrong: the website, for example, loses all of its headings and stability
> indexes.

### Configuring the dump

`json-simple` has no options of its own. It reads these global options, which
you can also set in a `json-simple` section to apply to it alone:

- `output` {string} The directory to write `api-docs.json` to. Without one,
  nothing is written. **Default:** from `global.output` (`--output`).
- `minify` {boolean} Write the JSON on a single line instead of indented.
  **Default:** `false`, from `global.minify` (`--minify`).

To dump the entries behind a configured site without writing into the
directory you publish, give the dump its own `output`, then build the site and
the dump in separate runs. A `-t` on the command line replaces the file's
`target`, so the second run reads the same inputs and builds only the dump:

```mjs displayName="doc-kit.config.mjs"
export default {
  target: ['html'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
  'json-simple': {
    output: 'debug',
  },
};
```

```bash
npx doc-kit generate                 # builds the site into out/
npx doc-kit generate -t json-simple  # writes debug/api-docs.json
```

### What the dump holds

An array of [API entries](https://doc-kit.nodejs.org/generators/metadata), one
for each heading in your sources, as the `metadata` stage built them, except
that each entry's `content` no longer contains its heading or its stability
index, since `heading` and `stability` already hold them. Here is the entry for
an `fs.readFile()` heading, with every node's `position` and the body's nodes
left out:

```json
{
  "api": "fs",
  "path": "/fs",
  "mdx": false,
  "basename": "fs",
  "heading": {
    "type": "heading",
    "depth": 2,
    "children": [
      {
        "type": "inlineCode",
        "value": "fs.readFile(path[, options], callback)"
      }
    ],
    "data": {
      "text": "`fs.readFile(path[, options], callback)`",
      "type": "method",
      "name": "readFile",
      "slug": "fsreadfilepath-options-callback"
    }
  },
  "added": "v0.1.29",
  "content": { "type": "root", "children": [] }
}
```

[What an entry holds](https://doc-kit.nodejs.org/generators/metadata#what-an-entry-holds)
describes every field. Nodes keep their `position` (line, column and offset in
the source file), which traces a node back to the Markdown it came from, and
makes the file large.

> [!WARNING]
> `api-docs.json` is not a stable format. It has no schema and mirrors
> doc-kit's internal entries, so its shape changes whenever the pipeline does.
> To build tools on your API data, use the `json` generator, whose output a
> versioned schema describes.
