# `json` Generator

The `json` generator writes one JSON document per source file. Each document
is a tree of the file's headings, in document order, with the metadata,
signature or type, Markdown body, and code examples of every one of them.

The output is described by a JSON schema, published at the URL every document
carries in `$schema`, and shipped with the package as
`@doc-kit/core/generators/json/schema.json`.

```sh
npx @doc-kit/cli generate -t json -i "doc/api/*.md" -o out
```

Files keep the input's directory layout: `doc/api/fs.md` becomes `out/fs.json`.

## Configuring

- `output` {string} The directory to write the documents to.
- `minify` {boolean} Whether to minify the output. Inherited from `global`.
  **Default:** `true`.
- `repository` {string} The `owner/name` repository source links resolve
  against. Inherited from `global`; without one, `sourceLink.url` is `null`.
- `schemaURL` {string} Where the schema is published. `{schemaVersion}` is
  filled in. **Default:**
  `'https://doc-kit.nodejs.org/schemas/api-doc/{schemaVersion}.json'`.

## The document

```json
{
  "$schema": "https://doc-kit.nodejs.org/schemas/api-doc/1.0.0.json",
  "id": "fs",
  "path": "/fs",
  "type": "module",
  "module": "fs",
  "title": "File system",
  "introducedIn": "v0.10.0",
  "sourceLink": {
    "path": "lib/fs.js",
    "url": "https://github.com/nodejs/node/blob/HEAD/lib/fs.js"
  },
  "stability": { "index": "2", "level": 2, "description": "Stable" },
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

- `id` is the file's path, slugged; `path` is that path without extension.
  Cross-document links in Markdown target `<path>.html`.
- `type` is the file's `type=` directive: `module` (the default), `misc`, or
  `global`. `module` is the module's name, from the `name=` directive.
- `introducedIn` and `sourceLink` are the `introduced_in=` and `source_link=`
  directives.
- Everything from `title` on is what every heading carries, described below.
- `children` are the file's headings, nested by depth.

## Every entry

The document and every node carry:

- `title` The heading text as authored, inline Markdown included.
- `stability` The stability index, or `null`: `{ index, level, description }`,
  where `index` is the text as authored (`"1.1"`), `level` its integer part,
  and `description` the Markdown after it.
- `added`, `deprecated`, `removed` Arrays of version strings, as authored.
- `napiVersion` An array of numbers.
- `changes` The change history: `{ versions, prUrl, commit, description }`.
- `description` The body as Markdown: everything under the heading except
  its metadata, its stability index, and the typed list a signature or type
  was taken from. Links are rewritten as they are for HTML output.
- `summary` A plain-text paragraph: the `llm_description` when there is one,
  else the first paragraph.
- `examples` The fenced code blocks of the body, `{ language, displayName, code }`.
  They stay in the description too.

Every key is always present. What is missing is `null` or an empty array.

## Nodes

A node is a heading below the title. Its `kind` says what the heading
documents, and decides which further properties it has:

| `kind`         | Heading                                        | Further properties           |
| -------------- | ---------------------------------------------- | ---------------------------- |
| `section`      | Anything else: prose, `DEP0005: …`, `--flag`   | none                         |
| `class`        | `` Class: `net.Server` ``                      | `extends` (`Type` or `null`) |
| `constructor`  | `` `new Agent([options])` ``                   | `signature`                  |
| `method`       | `` `fs.readFile(path[, options], callback)` `` | `signature`                  |
| `staticMethod` | `` Static method: `Buffer.from(string)` ``     | `signature`                  |
| `property`     | `` `buf.length` ``                             | `type`, `default`            |
| `event`        | `` Event: `'close'` ``                         | `parameters`                 |

Every node also has:

- `id` The heading's slug, and its anchor in HTML output.
- `name` The bare identifier: `readFile`, `Server`, `close`. A section's
  plain heading text. A `name=` directive overrides it.
- `scope` `module`, or `global` for entries typed `global`.
- `overloadOf` When several sibling headings document one callable, the `id`
  of the first on the second and later ones; otherwise `null`.
- `children` The headings nested under it.

## Signatures and types

```json
"signature": {
  "parameters": [
    {
      "name": "options",
      "type": { "text": "Object | string", "links": [{ "name": "Object", "href": "https://developer.mozilla.org/…", "start": 0, "end": 6 }] },
      "description": "",
      "default": null,
      "optional": true,
      "rest": false,
      "properties": [
        { "name": "encoding", "type": { "text": "string | null", "links": [] }, "description": "", "default": "null", "optional": true, "rest": false, "properties": [] }
      ]
    }
  ],
  "returns": { "type": { "text": "Promise", "links": [] }, "description": "Fulfills upon success." }
}
```

- A signature's `parameters` are the ones the heading declares, in order,
  described by the typed list under it. `optional` is set for parameters
  bracketed in the heading or documented with a default; `rest` for
  `...args`. `properties` are the nested list items: the properties of an
  options object, or the arguments of a callback.
- `returns` is the `Returns:` item, or `null`.
- A `Type` is the annotation's TypeScript text, normalised to one line with
  `|` between union members, plus the names in it that resolved to
  documentation, with their character offsets. A type that was not
  documented is `null`, never guessed.
- An event's `parameters` are the arguments its listeners receive.

## The schema

`schema.json` is the source of truth. After changing it, bump its `$id` and
`SCHEMA_VERSION` in `constants.mjs` together, and regenerate the types:

```sh
node scripts/generate-json-types.mjs
```
