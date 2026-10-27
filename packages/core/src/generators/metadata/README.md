# API entries

The `metadata` stage turns your parsed Markdown into a flat list of API
entries, one per heading, each with its kind, stability, history and linked
types. Every output except `api-links` is built from these entries, and
they're what a generator of your own usually reads.

**Stage:** `metadata` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** [Parsing Markdown](https://doc-kit.nodejs.org/generators/ast) · **Writes:** no files

## Usage

You don't ask for this stage: any target that reads API entries runs it, once
per run. The one thing to give it is a type map, so the types your docs
mention link to the pages documenting them:

```bash
npx doc-kit generate -t html -i "docs/**/*.md" -o out --type-map docs/type-map.json
```

To look at the entries themselves, run the
[Debug JSON](https://doc-kit.nodejs.org/generators/json#debug-json) target,
which writes them to `api-docs.json`.

## Configuring

Options go in the `metadata` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

```js displayName="doc-kit.config.mjs"
export default {
  metadata: {
    typeMap: 'docs/type-map.json',
  },
};
```

- `typeMap` {string} The path or URL of a JSON file mapping type names to the
  pages documenting them, relative to the working directory. `--type-map`
  sets it too. Without one, only JavaScript built-ins, web APIs and dotted
  names such as `vm.Module` get links. See [Type links](#type-links).
- `markdown` {Object} [Markdown plugins](https://doc-kit.nodejs.org/configuration#markdown-plugins)
  for this stage, added after the ones in `global.markdown`.
  - `remarkPlugins` {Array} Plugins for parsing the Markdown the stage
    writes itself, such as the links for man page references. Only their
    syntax extensions apply.

The stage works in chunks of `chunkSize` files across `threads` worker threads
(see [Execution options](https://doc-kit.nodejs.org/configuration#execution-options)).

## What an entry holds

Each heading of level 1 to 5 starts an entry, which runs until the next such
heading, whatever its level. Unlike an entry in the
[specification](https://doc-kit.nodejs.org/specification#12-definitions), it
doesn't hold the entries below it: outputs rebuild the hierarchy from the
heading levels. Anything before a file's first heading belongs to its
first entry, and a file without headings gets one entry, under an empty
level-1 heading that isn't rendered.

Every entry has these fields:

| Field       | Type      | Holds                                                                                                                              |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `api`       | `string`  | The file's identifier, made from its path: `/guide/widgets` becomes `guide-widgets`. Every entry of a file shares it.              |
| `path`      | `string`  | The file's path without its extension, from the directory its `input` glob starts at: `docs/guide/widgets.md` is `/guide/widgets`. |
| `basename`  | `string`  | The last segment of `path`, such as `widgets`.                                                                                     |
| `mdx`       | `boolean` | Whether the file was parsed as MDX.                                                                                                |
| `heading`   | `Object`  | The heading, as an mdast `heading` node. Its `depth` is its level, and its `data` holds the fields below.                          |
| `stability` | `Object`  | The section's stability index, as its blockquote node, when it has one. Its `data` holds the fields below.                         |
| `content`   | `Object`  | The section as an mdast `root` node: the heading, then everything up to the next entry, without its metadata comments.             |

The `data` of `heading` and `stability` holds:

| Field                        | Holds                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `heading.data.text`          | The heading's text, code spans included, such as `` `widget.spin(speed)` ``.          |
| `heading.data.name`          | The name of the API it documents, such as `spin`, or its text when it documents none. |
| `heading.data.slug`          | Its anchor, such as `widgetspinspeed`.                                                |
| `heading.data.type`          | Its [kind](#heading-kinds), when it has one.                                          |
| `stability.data.index`       | The level, such as `'2'` or `'1.1'`.                                                  |
| `stability.data.description` | The text after the level, on one line, such as `'Stable'`.                            |

The keys of the section's [metadata comments](#stability-and-metadata) are
fields of the entry too. These are the ones doc-kit's outputs use:

| Field                            | Type               | Holds                                                                                                   |
| -------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `added`, `deprecated`, `removed` | `string\|string[]` | The version or versions the API was added, deprecated or removed in.                                    |
| `changes`                        | `Object[]`         | Its history, each change with `version` (`string\|string[]`), `pr-url` and `description` (Markdown).    |
| `introduced_in`                  | `string`           | The version the page's module was introduced in.                                                        |
| `napiVersion`                    | `string`           | The Node-API version the API needs.                                                                     |
| `source_link`                    | `string`           | The path of the API's source file.                                                                      |
| `llm_description`                | `string`           | A plain-text summary, which outputs such as `llms.txt` and the JSON use instead of the first paragraph. |
| `type`                           | `string`           | A kind that replaces the heading's.                                                                     |
| `tags`                           | `string[]`         | The text of the section's plain comments.                                                               |

Later stages add a few fields of their own: `synthetic` and `chunk` on pages
they create, and `isOverload` and `overloadOf` on the headings of overloaded
functions. The `MetadataEntry` type in
[`types.d.ts`](https://github.com/nodejs/doc-kit/blob/main/packages/core/src/generators/metadata/types.d.ts)
describes the whole shape; a generator imports it from
`@doc-kit/core/generators/metadata/types`.

## Heading kinds

A heading documents an API when its text matches one of these patterns,
ignoring case. The pattern sets the heading's `type`, and its `name` comes
from the code span:

| Heading                                        | `type`        | `name`     |
| ---------------------------------------------- | ------------- | ---------- |
| `` `fs.readFile(path[, options], callback)` `` | `method`      | `readFile` |
| `` Event: `'close'` ``                         | `event`       | `close`    |
| `` Class: `Widget` ``                          | `class`       | `Widget`   |
| `` `new Widget([options])` ``                  | `ctor`        | `Widget`   |
| `` Static method: `Widget.from(value)` ``      | `classMethod` | `from`     |
| `` `widget.size` ``                            | `property`    | `size`     |

Any other heading, such as `Getting started`, is an entry without a `type`,
named after its text, so guides and prose sections reach every output like the
API reference does. A `type` key in the section's metadata replaces the kind:
this is how `<!--type=module-->` makes a Node.js page's first heading a
`module`, and how an entry becomes a `global`.

Slugs follow GitHub's rules, with a few changes that match the anchors of the
Node.js docs, and are unique within a file: a second `Options` heading gets
`options-1`. A heading that starts with a deprecation code, such as
`DEP0005: Buffer() constructor`, takes the code as its slug.

## Stability and metadata

A blockquote that starts with a stability level, such as
`> Stability: 1 - Experimental`, sets the entry's `stability`. The exception is
`documentation.md` at the root of the input, where Node.js defines the levels:
its stability blockquotes aren't attached to entries.

Metadata lives in HTML comments in the section, which are taken out of its
content:

```markdown
## `widget.spin(speed)`

<!-- YAML
added: v1.2.0
changes:
  - version: v2.0.0
    pr-url: https://github.com/your-org/your-repo/pull/42
    description: The `speed` parameter is optional.
-->
```

- A comment that starts with `YAML` holds YAML, whose keys become the entry's
  fields.
- A one-line comment is read as YAML too, and `key=value` works in it for
  `introduced_in`, `source_link`, `type`, `name` and `llm_description`, as in
  `<!--introduced_in=v0.10.0-->`. Plain text, such as `<!-- legacy -->`, adds
  that text to `tags`.
- Front matter at the top of a file counts as YAML for its first entry.
- When a section has several comments, lists such as `changes` and `tags` add
  up, and other keys take the last value.

[Writing documentation](https://doc-kit.nodejs.org/writing-docs#recording-history)
shows how to write them, and the
[Markdown specification](https://doc-kit.nodejs.org/specification) defines the
full syntax of headings, stability indexes and metadata.

## Type links

Each type annotation, a type in braces such as `{string}`, gets links to the
docs of the types it names. doc-kit first looks the whole annotation up, so the
keys of your type map can be display names such as `Widget options`. Otherwise,
each name in the type resolves through the first of these that knows it:

1. Your type map, by exact name.
2. JavaScript's built-in types and objects, ignoring case.
3. Web APIs documented on MDN, ignoring case.
4. A dotted name, linked the way the Node.js docs are laid out: `vm.Module`
   links to `vm.html#class-vmmodule`, and `fs.readFile` to
   `fs.html#fsreadfile`.

A name nothing resolves stays plain, which isn't an error. An annotation that
isn't valid TypeScript is split on `|` and each part looked up on its own; when
none resolves, doc-kit warns `Invalid type annotation` with its location.
Annotations in MDX files aren't resolved, since braces there hold JavaScript.

A type map is a JSON object of names and links (see
[The type map](https://doc-kit.nodejs.org/writing-docs#the-type-map) for when
to write one):

```json displayName="docs/type-map.json"
{
  "Widget": "api/widget.html",
  "Widget options": "api/widget.html#options",
  "Buffer": "https://nodejs.org/api/buffer.html#class-buffer"
}
```

A full URL, such as the one for `Buffer`, is used as it is. Any other link is a
path from the root of your input, which doc-kit makes relative to each page: on
`/guide/start`, `Widget` links to `../api/widget.html`. The
[TypeDoc plugin](https://doc-kit.nodejs.org/packages/typedoc) writes a type map
for the types it documents, and Node.js keeps
[its own](https://github.com/nodejs/node/blob/main/doc/type-map.json).

In `content`, each annotation is a `typeAnnotation` node, whose `data.links`
lists the linked ranges of its `value` as `start`, `end`, `text` and `href`.

## Other changes to the content

The stage also tidies each section's Markdown for the outputs:

- Reference-style links become plain links, and their definitions are removed.
- Links to `.md` files point to `.html` files instead, so `./fs.md#options`
  becomes `./fs.html#options`. Links with a scheme are left alone.
- A man page reference in prose, outside code spans, such as `open(2)`, links
  to its page on man7.org.

## What it produces

A generator reads the entries by declaring
`dependsOn: '@doc-kit/core/metadata'`, as
[Creating generators](https://doc-kit.nodejs.org/creating-generators#input-and-output)
shows. It receives every entry in one array. Each file's entries stay together,
in document order, but files arrive in the order their chunks finish, not the
order of `input`.
