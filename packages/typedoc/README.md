# `@doc-kit/typedoc`

A [TypeDoc](https://typedoc.org) plugin writing the API reference of a TypeScript project as [doc-kit Markdown](../../docs/specification.md): a page per module, namespace and export, with doc-kit's signatures, typed lists, stability indices and source links, which doc-kit then builds into a site.

## Usage

```sh
npm install --save-dev typedoc @doc-kit/typedoc
```

Load the plugin in your TypeDoc configuration, and set where the reference goes:

```js
// typedoc.config.mjs
import { load } from '@doc-kit/typedoc';

export default {
  plugin: [load],
  entryPoints: ['src/index.ts'],
  docKit: 'docs/api',
};
```

`docKit` is the `doc-kit` output's shortcut, like TypeDoc's `html` and `json`; `outputs: [{ name: 'doc-kit', path: 'docs/api' }]` works too. Passing `load` rather than the package name lets TypeDoc load the plugin from your project, which strict package managers keep apart from TypeDoc's own installation.

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

## Output

The output directory receives, following TypeDoc's own layout:

- A page per module and namespace (`modules/plugins.md`), listing its exports.
- A page per exported class, interface, enum, type alias, function and variable: `classes/Watcher.md`, `functions/build.md`, …
- A page per member of the types in `docKitMemberPages`: `interfaces/BuildOptions.input.md`, …
- `type-map.json`, mapping type names to their pages, for doc-kit's `typeMap` to link `{Type}` annotations with.
- `pages.json`, listing every page (full name, kind, URL and `@category`) for the site to build its navigation from.

`docKitUrlAdapter` adapts these URLs, to keep the URLs of a previous site working. Links between pages are relative `.md` links, which doc-kit resolves. Source links are relative to TypeDoc's `basePath` (or `displayBasePath`); set it to the root of your repository.

## How comments are rendered

- Call signatures become doc-kit signatures: a `` `name(a[, b])` `` heading and a typed list of the parameters and return value, with `@param` and `@returns` descriptions. The properties of object parameters are nested in the list.
- Properties and accessors become entries with a `Type:` item, and `@default` values. Object types, including `Partial`, `Readonly` and `Required` ones, have an entry per property.
- A class extending `EventEmitter<Events>`, or a typed emitter whose `on()` takes `(...args: Events[E]) => void` listeners, gets an `Event:` entry per member of `Events`, listing the arguments of its listeners (a tuple per event).
- Members are anchored by their name alone too (`#resolveid`), besides doc-kit's anchor of their heading, so links to them survive changes of their signature.
- `@deprecated` and `@experimental` become stability indices.
- `@example`, `@see` and `@throws` follow the description. Block tags of your own (declared with TypeDoc's `blockTags`) are rendered as `**Tag:** content`.
- `{@link}` and `{@linkcode}` link to the target's page or entry.
- With several entry points, pages of exports missing from the main one say which entry points export them, by module name (set with `@module`). The main entry point is the first, or the project itself when merged into it with `@mergeModuleWith <project>`, which also leaves the module name out of its exports' URLs.

## Options

- `docKit` {string} Where to write the reference.
- `docKitBasePath` {string} Where the output directory is under doc-kit's input directory, which the type map and the page list are relative to. **Default:** the output directory's name (`api`).
- `docKitTypeMap` {string|null} The type map's file name, in the output directory. `null` leaves it out. **Default:** `'type-map.json'`.
- `docKitPageList` {string|null} The page list's file name, in the output directory. `null` leaves it out. **Default:** `'pages.json'`.
- `docKitMemberPages` {string[]} Interfaces and classes whose members are each documented on a page of their own, such as a bundler's options. Their own page, the pages of the types extending them, and the parameters of their type list the members and link to their pages, rather than repeating their documentation. **Default:** `[]`.
- `docKitUrlAdapter` {Function} Adapts the URL of each page: called with its default URL, without extension (`interfaces/Plugin`), and its reflection, it returns the URL to use (`Interface.Plugin`). Links, the type map and the page list follow it. **Default:** `undefined`.
- `docKitReceivers` {Object} The name members of a type are documented on, by type name: `{ "PluginContext": "this" }` documents `this.resolve()`. **Default:** the type name in camelCase (`pluginContext.resolve()`).
