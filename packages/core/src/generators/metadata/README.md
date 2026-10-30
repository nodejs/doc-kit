# API entries

The `metadata` stage turns your parsed Markdown into a flat list of API
entries, one per heading, each with its kind, stability, history and linked
types. Every output except `api-links` is built from these entries, and
they're what a generator of your own usually reads.

You don't ask for this stage: any target that reads API entries runs it, once
per run. To look at the entries themselves, run the
[Debug JSON](https://doc-kit.nodejs.org/generators/json-simple) target.

## Configuring

- `typeMap` {string} The path or URL of a JSON file mapping type names to the
  pages documenting them. `--type-map` sets it too. See
  [Types that link themselves](https://doc-kit.nodejs.org/writing-docs#types-that-link-themselves)
  and [The type map](https://doc-kit.nodejs.org/writing-docs#the-type-map).

## What an entry holds

Each heading of level 1 to 5 starts an entry, which runs until the next such
heading, whatever its level. Unlike an entry in the
[specification](https://doc-kit.nodejs.org/specification#12-definitions), it
doesn't hold the entries below it: outputs rebuild the hierarchy from the
heading levels. Anything before a file's first heading belongs to its
first entry, and a file without headings gets one entry, under an empty
level-1 heading that isn't rendered.

| Field       | Type      | Holds                                                                                                                              |
| ----------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `api`       | `string`  | The file's identifier, made from its path: `/guide/widgets` becomes `guide-widgets`. Every entry of a file shares it.              |
| `path`      | `string`  | The file's path without its extension, from the directory its `input` glob starts at: `docs/guide/widgets.md` is `/guide/widgets`. |
| `basename`  | `string`  | The last segment of `path`, such as `widgets`.                                                                                     |
| `mdx`       | `boolean` | Whether the file was parsed as MDX.                                                                                                |
| `heading`   | `Object`  | The heading, as an mdast `heading` node. Its `data` holds its `text`, `name`, `slug` and kind (`type`).                            |
| `stability` | `Object`  | The section's stability index, as its blockquote node, when it has one. Its `data` holds `index` and `description`.                |
| `content`   | `Object`  | The section as an mdast `root` node: the heading, then everything up to the next entry, without its metadata comments.             |

The keys of the section's metadata comments, such as `added`, `changes` and
`llm_description`, are fields of the entry too. The `MetadataEntry` type in
[`types.d.ts`](https://github.com/nodejs/doc-kit/blob/main/packages/core/src/generators/metadata/types.d.ts)
describes the whole shape; a generator imports it from
`@doc-kit/core/generators/metadata/types`.

A generator reads the entries by declaring
`dependsOn: '@doc-kit/core/metadata'`, as
[Creating generators](https://doc-kit.nodejs.org/creating-generators#input-and-output)
shows. It receives every entry in one array. Each file's entries stay together,
in document order, but files arrive in the order their chunks finish, not the
order of `input`.
