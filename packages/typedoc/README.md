# `@doc-kit/typedoc`

A [TypeDoc](https://typedoc.org) plugin that writes the API reference of a
TypeScript project, or of a JavaScript one documented with JSDoc, as
[doc-kit Markdown](https://doc-kit.nodejs.org/specification). doc-kit then
builds it into your site next to your hand-written pages: a page per module,
namespace and export, with signatures, typed lists, stability indicators and
source links.

> [!IMPORTANT]
> This plugin is experimental: its output and options may change in any
> release.

This page is the plugin's reference.
[Documenting TypeScript](https://doc-kit.nodejs.org/typescript) walks through
it step by step, from a TypeScript or JavaScript project to a built site.

## Usage

Install TypeDoc and the plugin, plus the doc-kit CLI and the website generators
to build the site:

```bash
npm install --save-dev typedoc@0.28 @doc-kit/typedoc @doc-kit/cli @doc-kit/generator-react
```

The plugin is built for TypeDoc 0.28. Load it in your TypeDoc configuration,
and set where the reference goes with `docKit`:

```js displayName="typedoc.config.mjs"
import { load } from '@doc-kit/typedoc';

export default {
  plugin: [load],
  entryPoints: ['src/index.ts'],
  // Source links are relative to this: the root of your repository
  basePath: '.',
  docKit: 'docs/api',
};
```

Import `load` rather than naming the plugin as a string: TypeDoc imports
plugins named by a string from its own installation, where package managers
such as pnpm hide your project's dependencies. `docKit` is the shortcut for
the plugin's `doc-kit` output, as `html` is for TypeDoc's own;
`outputs: [{ name: 'doc-kit', path: 'docs/api' }]` works too.

Then point doc-kit at the Markdown, and at its type map:

```js displayName="doc-kit.config.mjs"
export default {
  target: ['html'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
    repository: 'your-org/your-repo',
  },
  metadata: { typeMap: 'docs/api/type-map.json' },
};
```

Generate the reference with TypeDoc, which finds `typedoc.config.mjs` on its
own, then build the site:

```bash
npx typedoc
npx doc-kit generate
```

## Output

The output directory follows TypeDoc's layout:

| File                                          | What it holds                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `modules/plugins.md`                          | A page per module and namespace, listing its exports by group                                      |
| `classes/Watcher.md`, `functions/build.md`, … | A page per exported class, interface, enum, type alias, function and variable                      |
| `classes/plugins.BannerPlugin.md`             | An export of a namespace, or of a module when there are several entry points, prefixed by its name |
| `interfaces/BuildOptions.input.md`            | A page per member of the types listed in [`docKitMemberPages`](#options)                           |
| `type-map.json`                               | Type names mapped to their pages, for doc-kit's `metadata.typeMap`                                 |
| `pages.json`                                  | Every page, for building your site's navigation                                                    |

- With several entry points, each one is a module, so the pages of its exports
  are prefixed by its name, the main entry point's included. An entry point
  merged into the project with `@mergeModuleWith <project>` is the exception:
  its exports become the project's own.
- The project itself gets no page, so the reference's landing page is yours to
  write (`docs/api/index.md`, for instance).
- The plugin doesn't empty the directory before writing, so delete it before
  regenerating when you remove or rename exports.
- Pages link to each other with relative `.md` links, which doc-kit resolves.

Source links point to `https://github.com/<repository>/blob/<ref>/<file>`.
The file path is relative to TypeDoc's `displayBasePath` or `basePath` (or,
without either, the common directory of your sources), so set `basePath` to
your repository's root and doc-kit's
[`global.repository`](https://doc-kit.nodejs.org/configuration#global-options)
to the repository. On the website, `<ref>` is
[`jsx-ast.ref`](https://doc-kit.nodejs.org/generators/jsx-ast#configuring),
`'main'` by default. External declarations (TypeDoc's `externalPattern`) get
no source link.

### The type map

`type-map.json` maps each class, interface, enum and type alias to its page,
for doc-kit to
[link the `{Type}` annotations](https://doc-kit.nodejs.org/generators/metadata#type-links)
of the reference, and of any other page that names your types. Its paths
start with [`docKitBasePath`](#options) and have no extension, so the type
links need a host that serves `/api/classes/Watcher` from `Watcher.html` (see
[Page URLs](https://doc-kit.nodejs.org/publishing#page-urls)).

### The page list

`pages.json` lists every page with its `name` (the full name, such as
`plugins.BannerPlugin`), `kind` (`Class`, `Function`, …), `url` (the page path
doc-kit gives it, such as `/api/classes/Watcher`) and, when you use
`@category`, its `category`. Types documented on a member's page (see
[`docKitMemberPages`](#options)) are left out.

The `url` is the form the
[website's sidebar](https://doc-kit.nodejs.org/generators/html#sidebar) links
take.
[Building the sidebar](https://doc-kit.nodejs.org/typescript#building-the-sidebar)
turns the list into sidebar groups.

## How code and comments are rendered

### Declarations

- **Functions**, methods, and variables or type aliases of a function type
  become doc-kit signatures: a heading such as `watcher.close([force])`, with
  optional parameters in brackets, and a typed list of the parameters and the
  return value. Each overload gets an entry of its own.
  - Properties of object parameters are nested in the typed list. Only the
    first paragraph of a parameter's description goes in the list; the rest
    follows it.
  - A `this` parameter becomes a `**Context:**` note. A `void` or `undefined`
    return gets no `Returns:` item unless `@returns` describes it.
- **Classes** get a `Class:` heading, constructors a `new Watcher()` one, and
  static methods a `Static method:` one.
- **Members** are documented on their type. Static and enum members use its
  name (`Watcher.create()`, `Level.Info`), and instance members its name with
  the first letter lowercased (`watcher.close()`) or the name set in
  [`docKitReceivers`](#options). Each member is also anchored by its name alone
  (`#resolveid` for `resolveId`), so links to it survive changes to its
  signature. Members grouped with `@group` get a section per group.
- **Properties** and accessors become entries with a `Type:` item. The
  properties of object types, `Partial`, `Readonly` and `Required` ones
  included, get entries nested under them.
- **Events**: a class extending `EventEmitter<Events>`, or a type whose `on()`
  takes a `(...args: Events[E]) => void` listener, gets an `Event:` entry per
  property of `Events`. Each property is a tuple of the listener's arguments;
  name its elements (`[error: Error, file: string]`), since unnamed ones are
  left out.
- **Inheritance**: classes and interfaces list what they extend in an
  `Extends:` item, and the types extending them in an `Extended by` note.
- **Types**: type parameters show their constraint (`keyof Events` for
  `E extends keyof Events`), and the parts of a type past TypeDoc's
  `maxTypeConversionDepth` show as `unknown`.
- **Several entry points**: the pages of exports the main entry point doesn't
  export say which entry points do, by module name (set with `@module`). The
  main entry point is the one merged with `@mergeModuleWith <project>`, or
  else the module TypeDoc lists first: the first by name with its default
  `sort`, or the first entry point when `sortEntryPoints` is `false`.

### Tags

- `@param` and `@returns` describe the items of the typed list.
- `@deprecated` becomes a stability indicator of `0 - Deprecated`, followed by
  the tag's text, and `@experimental` one of `1 - Experimental`.
- `@default` and `@defaultValue` add a default to the `Type:` or parameter
  item when they hold a value (a word, a sentence, or a one-line code block).
  A longer default gets a "Default" section. Parameters without the tag show
  their declared default.
- `@example` follows the description, in an "Example" section.
- `@see` follows the description as a "See" line, and `@throws` as a
  `**Throws:**` one.
- `{@link}` and `{@linkcode}` link to the target's page or entry.
- The first sentence of `@summary`, or else of the first paragraph, describes
  an export on its module's page, and a member in the lists linking to its own
  page.
- `@category` sets the page's `category` in the page list.
- Block tags of your own, declared with TypeDoc's `blockTags` option, become
  `**Tag:** content`. TypeDoc's other block tags, such as `@remarks` and
  `@since`, are left out.

## Options

The plugin adds these options to TypeDoc's:

- `docKit` {string} Where to write the reference, such as `'docs/api'`.
  Setting it runs the `doc-kit` output.
- `docKitBasePath` {string} Where the output directory sits under the directory
  doc-kit's `input` glob starts from (`docs` for `docs/**/*.md`). The paths in
  the type map and the page list start with it, and its leading and trailing
  slashes are ignored. **Default:** the output directory's name (`'api'` for
  `docs/api`).
- `docKitTypeMap` {string|null} The type map's file name, in the output
  directory. `null` or `''` leaves it out. **Default:** `'type-map.json'`.
- `docKitPageList` {string|null} The page list's file name, in the output
  directory. `null` or `''` leaves it out. **Default:** `'pages.json'`.
- `docKitMemberPages` {string[]} Exported interfaces and classes whose members
  each get a page of their own, such as a bundler's options. Wherever such a
  type's members would be documented in full, each is listed instead, with its
  type, the first sentence of its description and a link to its page. A type
  that only one of these members uses (`TreeshakeOptions` in
  `boolean | TreeshakeOptions`) is documented on that member's page, and links
  to the type lead there. Names that match no exported interface or class with
  members log a warning. **Default:** `[]`.
- `docKitUrlAdapter` {Function} Adapts the URL of each page. It's called with
  the page's default URL, without an extension (`'interfaces/Plugin'`), and its
  TypeDoc reflection, and returns the URL to use (`'Interface.Plugin'`). Links,
  the type map and the page list follow it. Set it in a JavaScript
  configuration file. **Default:** `undefined`.
- `docKitReceivers` {Record<string, string>} The name the members of a type are
  documented on, by type name: `{ PluginContext: 'this' }` documents
  `this.resolve()` rather than `pluginContext.resolve()`. **Default:** `{}`, so
  members are documented on the type's name with its first letter lowercased.

For example, to keep the URLs of a site whose interface pages were at
`Interface.<name>`:

```js displayName="typedoc.config.mjs"
import { load } from '@doc-kit/typedoc';

export default {
  plugin: [load],
  entryPoints: ['src/index.ts'],
  docKit: 'docs/api',
  docKitUrlAdapter: url => url.replace(/^interfaces\//, 'Interface.'),
};
```
