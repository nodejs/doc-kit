# Debug JSON

The `json-simple` generator dumps the API entries doc-kit parsed from your
sources into one JSON file. Almost every other generator reads these entries,
so when an output looks wrong, this file tells you whether the entry itself is
wrong or the generator that rendered it.

**Target:** `json-simple` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** `api-docs.json`

## Usage

`@doc-kit/core` comes with the CLI, so there's nothing else to install:

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

## Configuring

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
describes every field. Nodes keep their `position` (line, column and offset in
the source file), which traces a node back to the Markdown it came from, and
makes the file large.

> [!WARNING]
> `api-docs.json` is not a stable format. It has no schema and mirrors
> doc-kit's internal entries, so its shape changes whenever the pipeline does.
> To build tools on your API data, use the
> [`json` generator](https://doc-kit.nodejs.org/generators/json), whose output
> a versioned schema describes.
