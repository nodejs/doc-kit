# `@doc-kit/typedoc`

A [TypeDoc](https://typedoc.org) plugin writing the API reference of a TypeScript project as [doc-kit Markdown](../../docs/specification.md): one page per export, with doc-kit's signatures, typed lists, stability indices and source links, which doc-kit then builds into a site.

## Usage

Install it next to TypeDoc:

```sh
npm install --save-dev typedoc @doc-kit/typedoc
```

Add it to your TypeDoc configuration, with its `doc-kit` output:

```js
// typedoc.config.mjs
import { fileURLToPath } from 'node:url';

export default {
  // A path resolved from your project: TypeDoc resolves plugin names from
  // its own installation, which strict package managers keep apart
  plugin: [fileURLToPath(import.meta.resolve('@doc-kit/typedoc'))],
  entryPoints: ['src/index.ts'],
  outputs: [{ name: 'doc-kit', path: 'docs/api' }],
};
```

Then generate the reference, and point doc-kit at it:

```sh
npx typedoc --options typedoc.config.mjs
```

```js
// doc-kit.config.mjs
export default {
  global: { input: ['docs/**/*.md'] },
  metadata: { typeMap: 'docs/api/type-map.json' },
};
```

`typedoc --watch` keeps the reference up to date as the sources change; only the pages that changed are written.

## Output

The output directory receives:

- A page per exported function, class, interface, type alias and variable: `Function.build.md`, `Interface.BuildOptions.md`, …
- A page per member of the types in `docKitMemberPages`: `BuildOptions.input.md`, …
- `type-map.json`, mapping type names to their pages, for doc-kit's `typeMap` to link `{Type}` annotations with.
- `pages.json`, listing every page (name, kind, URL, `@category`, and the type of a member page) for the site to build its navigation from.

Other files in the directory (an `index.md` you write, for instance) are left alone.

## How comments are rendered

- Call signatures become doc-kit signatures: a `` `name(a[, b])` `` heading and a typed list of the parameters and return value, with `@param` and `@returns` descriptions. The properties of object parameters are nested in the list.
- Properties become entries with a `Type:` item, and `@default` values.
- `@deprecated` and `@experimental` become stability indices.
- `@example`, `@see` and `@throws` follow the description. Block tags of your own (declared with TypeDoc's `blockTags`) are rendered as `**Tag:** content`.
- `{@link}` and `{@linkcode}` link to the target's page or entry.

## Options

- `docKitBasePath` {string} The URL path the pages are served under. **Default:** the output directory's name (`/api`).
- `docKitSiteUrl` {string} The URL of the site. Absolute links to it in comments become relative.
- `docKitMemberPages` {string[]} Types whose members are each documented on a page of their own, such as a bundler's options. Their own page, the pages of the types extending them, and the parameters of their type list the members and link to their pages, rather than repeating their documentation. **Default:** `[]`.
- `docKitReceivers` {Object} The name members of a type are documented on, by type name: `{ "PluginContext": "this" }` documents `this.resolve()`. **Default:** the type name in camelCase (`pluginContext.resolve()`).
- `docKitEvents` {Object} Event emitters, mapped to the type mapping their event names to the arguments of their listeners (a tuple per event): `{ "Watcher": "WatcherEvents" }` documents `Event: 'change'` entries on `Watcher`'s page. **Default:** `{}`.
- `docKitSignatureSources` {Object} Types whose members take their signatures from the members of the same name of another type, by type name, for members whose type is too generic to document (a plugin's hooks, for instance). **Default:** `{}`.
- `docKitImportPaths` {Object} The import path of each entry point, by file. Pages of exports missing from the shortest import path say where they are exported from. **Default:** `{}`.
- `docKitMemberAnchors` {boolean} Give members an anchor of their name alone (`#input`) besides doc-kit's anchor of their heading, to keep links of a previous site working. **Default:** `false`.
