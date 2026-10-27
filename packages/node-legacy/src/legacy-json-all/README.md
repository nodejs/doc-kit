# Legacy JSON bundle

The `legacy-json-all` generator writes the `all.json` of Node.js's legacy JSON
format: the sections of every
[legacy JSON](https://doc-kit.nodejs.org/generators/legacy-json) file merged
into one file. It exists for Node.js and the tools that read that file; for
your own API in one file, use the
[JSON bundle](https://doc-kit.nodejs.org/generators/json-all).

**Target:** `legacy-json-all` · **Package:** [`@node-core/doc-kit-legacy`](https://doc-kit.nodejs.org/packages/node-legacy) · **Reads:** [Legacy JSON](https://doc-kit.nodejs.org/generators/legacy-json) · **Writes:** `all.json`

## Usage

From the root of a Node.js checkout:

```bash
npm install --save-dev @doc-kit/cli @node-core/doc-kit-legacy
npx doc-kit generate -t legacy-json-all -i "doc/api/*.md" -o out \
  --index doc/api/index.md
```

This writes `out/all.json`. `legacy-json` runs first without being listed, and
writes its own files to the same directory, such as `out/fs.json`.

## Configuring

Options go in the `legacy-json-all` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

- `sourceURL` {string} The template `legacy-json` built each file's `source`
  from, which the bundle uses to match files to the index. If you change
  `legacy-json.sourceURL`, set the same value here. **Default:**
  `'doc/api/{path}'`.
- `output` {string} The directory to write `all.json` to. Without one, nothing
  is written. **Default:** from `global.output` (`--output`).
- `minify` {boolean} Write the bundle without indentation. **Default:**
  `false`, from `global.minify` (`--minify`).
- `index` {string|Array} The path or URL of an `index.md` whose
  `* [Title](file.md)` links set the order of the files, or the parsed list of
  `{ section, api }` objects. **Default:** from `global.index` (`--index`).

## What the bundle holds

For a `doc/api/kittens.md` holding a `# Kittens` heading and a paragraph:

```json displayName="out/all.json"
{
  "miscs": [],
  "modules": [
    {
      "textRaw": "Kittens",
      "name": "kittens",
      "type": "module",
      "desc": "<p>Everything about <code>Kitten</code> objects.</p>",
      "displayName": "Kittens",
      "source": "doc/api/kittens.md"
    }
  ],
  "classes": [],
  "globals": [],
  "methods": []
}
```

- `miscs`, `modules`, `classes`, `globals` and `methods` hold the sections at
  the top of every file, in the same format (see
  [What a file holds](https://doc-kit.nodejs.org/generators/legacy-json#what-a-file-holds)),
  each with the `source` of its file added.
- The files the index links to come first, in the order of the links. The rest
  follow in no set order, so pass an index that lists every file.
- The file of the top-level `index.md` is left out.
