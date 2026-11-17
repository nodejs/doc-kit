# JSON bundle

The `json-all` generator writes every document of the
[`json` generator](https://doc-kit.nodejs.org/generators/json) into a single
`all.json`, for tools that would rather load your whole API from one file.

## Usage

```bash
npx @doc-kit/cli generate -t json-all -i "doc/api/*.md" -o out --index doc/api/index.md
```

This writes `out/all.json`. `json` runs first without being listed, and writes
its own files to the same directory. To leave those out, see
[Writing only the bundle](#writing-only-the-bundle).

## Configuring

- `schemaURL` {string} URL template for the bundle's `$schema`.
  `{schemaVersion}` is the schema's version. The documents inside keep the
  `$schema` from `json.schemaURL`. **Default:**
  `'https://doc-kit.nodejs.org/schemas/api-doc-all/{schemaVersion}.json'`.

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options)
`output`, `minify` and `index`, which sets the
[document order](#document-order). The documents themselves come from `json`,
so the options that shape them, such as `repository` and `ref`, go in the
`json` section or in `global` (see
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

Without an index, the documents are sorted by `id`. With one, the documents
its links point to come first, in the order of the links, and the rest follow
by `id`:

```text displayName="docs/index.md"
# My library

* [Getting started](getting-started.md)
* [Configuration](configuration.md)
```

- A link places the document whose `id` is the link's target without `.md`:
  `getting-started.md` matches the document of `docs/getting-started.md`.
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
