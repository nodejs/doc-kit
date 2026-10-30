# Debug JSON

The `json-simple` generator dumps the API entries doc-kit parsed from your
sources into one JSON file. Almost every other generator reads these entries,
so when an output looks wrong, this file tells you whether the entry itself is
wrong or the generator that rendered it.

## Usage

```bash
npx @doc-kit/cli generate -t json-simple -i "docs/**/*.md" -o out
```

This writes `out/api-docs.json`.

## Configuring

`json-simple` has no options of its own. It writes to `output`, minified with
`minify`, both [global options](https://doc-kit.nodejs.org/configuration#global-options).

## What the dump holds

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
describes every field.

> [!WARNING]
> `api-docs.json` is not a stable format. It has no schema and mirrors
> doc-kit's internal entries, so its shape changes whenever the pipeline does.
> To build tools on your API data, use the
> [`json` generator](https://doc-kit.nodejs.org/generators/json), whose output
> a versioned schema describes.
