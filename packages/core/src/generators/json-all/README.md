# JSON bundle

The `json-all` generator writes every document of the
[`json` generator](https://doc-kit.nodejs.org/generators/json) into a single
`all.json`, for tools that would rather load your whole API from one file.

**Target:** `json-all` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** [JSON](https://doc-kit.nodejs.org/generators/json) · **Writes:** `all.json`

## Usage

`@doc-kit/core` comes with the CLI, so there's nothing else to install:

```bash
npx doc-kit generate -t json-all -i "docs/**/*.md" -o out
```

This writes `out/all.json`. `json` runs first without being listed, and writes
its own files to the same directory, such as `out/getting-started.json`. To
leave those out, see [Writing only the bundle](#writing-only-the-bundle).

## Configuring

Options go in the `json-all` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

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

The documents themselves come from `json`, so the options that shape them,
such as `repository` and `ref`, go in the `json` section or in `global` (see
[JSON](https://doc-kit.nodejs.org/generators/json#configuring)).

## What the bundle holds

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
  own file (see
  [The document](https://doc-kit.nodejs.org/generators/json#the-document)), in
  the [document order](#document-order).

The bundle's schema ships as `@doc-kit/core/generators/json-all/schema.json`
and is published at the default `$schema` URL. For the documents, it refers to
the `json` schema of the same version.

## Document order

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

## Writing only the bundle

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
