# Legacy JSON

The `legacy-json` generator writes Node.js's legacy JSON format: one JSON file
per source file, as Node.js's original documentation tooling wrote it next to
each HTML page, with descriptions in HTML. It exists for Node.js and the tools
that read those files; for API data of your own, use the
[`json` generator](https://doc-kit.nodejs.org/generators/json), whose format a
versioned schema describes.

## Usage

From the root of a Node.js checkout:

```bash
npx @doc-kit/cli generate -t legacy-json -i "doc/api/*.md" -o out
```

The files keep the input's directory layout, from where the glob starts:
`doc/api/fs.md` becomes `out/fs.json`.

## Configuring

- `sourceURL` {string} The `source` each file records. `{path}` is the file's
  `api` identifier with `.md` (`fs.md`), and is the only placeholder.
  **Default:** `'doc/api/{path}'`.

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options).
Without an `output`, the files only go to
[`legacy-json-all`](https://doc-kit.nodejs.org/generators/legacy-json-all).

The descriptions render Markdown with a fixed set of plugins, so a `markdown`
section for this generator is ignored with a warning.

## What a file holds

For this page:

```md displayName="doc/api/kittens.md"
# Kittens

<!--introduced_in=v1.0.0-->

> Stability: 2 - Stable

Everything about `Kitten` objects.

## Class: `Kitten`

<!-- YAML
added: v1.0.0
-->

A small cat.

### `kitten.meow([volume])`

- `volume` {number} How loud. **Default:** `1`.
- Returns: {boolean}

Makes the kitten meow.
```

`legacy-json` writes:

```json displayName="out/kittens.json"
{
  "type": "module",
  "source": "doc/api/kittens.md",
  "modules": [
    {
      "textRaw": "Kittens",
      "name": "kittens",
      "introduced_in": "v1.0.0",
      "type": "module",
      "stability": 2,
      "stabilityText": "Stable",
      "desc": "<p>Everything about <code>Kitten</code> objects.</p>",
      "classes": [
        {
          "textRaw": "Class: `Kitten`",
          "name": "Kitten",
          "type": "class",
          "meta": { "added": ["v1.0.0"], "changes": [] },
          "desc": "<p>A small cat.</p>",
          "methods": [
            {
              "textRaw": "`kitten.meow([volume])`",
              "name": "meow",
              "type": "method",
              "signatures": [
                {
                  "params": [
                    {
                      "textRaw": "`volume` {number} How loud. **Default:** `1`.",
                      "name": "volume",
                      "type": "number",
                      "default": "`1`",
                      "desc": "How loud.",
                      "optional": true
                    }
                  ],
                  "return": {
                    "textRaw": "Returns: {boolean}",
                    "name": "return",
                    "type": "boolean"
                  }
                }
              ],
              "desc": "<p>Makes the kitten meow.</p>"
            }
          ]
        }
      ],
      "displayName": "Kittens"
    }
  ]
}
```

- The file is a `module` with the `source` from `sourceURL`. Its first heading
  is the first entry of its `modules`.
- Each heading becomes a section in its parent, under a key for its kind:
  `modules` for plain headings, `classes`, `methods`, `properties`, `events`,
  `classMethods`, `signatures` for constructors, and `miscs`, `globals` and
  `vars` for headings typed so.
- A section has its heading as `textRaw`, a `name`, its `type`, and `desc`,
  its content rendered to HTML. `meta` holds its `added`, `deprecated`,
  `removed`, `napiVersion` and `changes`, and `stability` and `stabilityText`
  its stability index. Keys a section has no value for are left out.
- The typed list under a heading is parsed out of `desc`: a method's
  parameters and return value go in `signatures`, an event's arguments in
  `params`, and a property's first item gives its `type` and `default`. A
  constructor, under its class's `signatures`, carries its `params` itself.
