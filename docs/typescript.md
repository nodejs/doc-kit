# Documenting TypeScript

If your API is written in TypeScript, or in JavaScript with JSDoc comments,
its reference can come from the source. [TypeDoc](https://typedoc.org) reads
your code and its doc comments, the `@doc-kit/typedoc` plugin writes them as
doc-kit Markdown (a page per export, with signatures, typed lists, stability
and source links), and doc-kit builds those pages into one site with your
hand-written guides.

> [!NOTE]
> `@doc-kit/typedoc` is experimental: its output and options can still change.

It takes two commands: `npx typedoc` writes the reference into `docs/api/`,
then `npx @doc-kit/cli generate` builds everything in `docs/`.

## Install

```bash
npm install --save-dev typedoc@0.28 @doc-kit/typedoc @doc-kit/cli @doc-kit/generator-react
```

`typedoc` and `@doc-kit/typedoc` write the reference, and `@doc-kit/cli` and
`@doc-kit/generator-react` build the site, as in
[Getting started](./getting-started.md).

## Configure TypeDoc

Create `typedoc.config.mjs` next to your `package.json`:

```mjs displayName="typedoc.config.mjs"
import { load } from '@doc-kit/typedoc';

export default {
  plugin: [load],
  entryPoints: ['src/index.ts'],
  // Source links are relative to it: the root of your repository
  basePath: '.',
  docKit: 'docs/api',
};
```

The [`@doc-kit/typedoc` reference](./packages/typedoc.md#usage) explains why
the plugin is passed as `load`, and its [Output](./packages/typedoc.md#output)
section why `basePath` is your repository's root. Everything else, such as
entry points, the `tsconfig` and which exports to include, is configured with
TypeDoc's own options.

## Generate the reference

```bash
npx typedoc
```

TypeDoc finds `typedoc.config.mjs` in the working directory, and the plugin
writes the reference in TypeDoc's folder layout:

```text
docs/api/
├── functions/
│   └── adopt.md
├── interfaces/
│   └── Kitten.md
├── pages.json
└── type-map.json
```

The [`@doc-kit/typedoc` reference](./packages/typedoc.md#output) describes
each file.

## From doc comments to Markdown

Take this source file:

```ts displayName="src/index.ts"
/** A kitten, adopted or not. */
export interface Kitten {
  /** The kitten's name. */
  name: string;
}

/**
 * Adopts a kitten, once the paperwork is done.
 *
 * @param name - The kitten's name.
 * @param options - How to adopt it.
 * @param options.color - Coat color.
 * @param options.signal - Cancels the adoption.
 * @returns The adopted kitten.
 * @experimental
 */
export async function adopt(
  name: string,
  options: { color?: string; signal?: AbortSignal } = {}
): Promise<Kitten> {
  return { name };
}
```

The plugin writes `adopt()` as this page:

```markdown displayName="docs/api/functions/adopt.md"
# `adopt(name[, options])`

<!-- YAML
title: "Function: adopt()"
source_link: src/index.ts#L17
-->

> Stability: 1 - Experimental

- `name` {string} The kitten's name.
- `options` {Object} How to adopt it. **Default:** `{}`.
  - `color` {string} Coat color.
  - `signal` {AbortSignal} Cancels the adoption.
- Returns: {Promise<Kitten>} The adopted kitten.

Adopts a kitten, once the paperwork is done.
```

It's the Markdown you would write by hand, as described in
[Writing documentation](./writing-docs.md):

- The heading is the call, with `options` in brackets: it has a default
  value, so it's optional.
- The YAML comment holds the page title and the link to the source.
- `@experimental` becomes a stability indicator.
- The typed list holds each parameter's type and `@param` description, the
  properties of `options` nested under it, and the return value with its
  `@returns` description.
- The summary follows, as the entry's description.

Once doc-kit builds it, `Promise<Kitten>` links to the `Kitten` page through
the type map, and `Promise` and `AbortSignal` link to MDN.

Other tags follow the same pattern: `@deprecated` becomes a
`Stability: 0 - Deprecated` indicator with its message, `@example` an
"Example" section, and `{@link}` a link to its target. TypeDoc's `@remarks`
and `@since` aren't rendered, so keep that text in the summary.

Declarations follow doc-kit's conventions too: a class gets a `Class:`
heading, and a property an entry with a `Type:` item, named after its owner
with a lowercase first letter, such as `kitten.name`. The
[`@doc-kit/typedoc` reference](./packages/typedoc.md#how-code-and-comments-are-rendered)
lists every tag and declaration the plugin renders.

## Build the site

Point doc-kit at the whole `docs/` folder, and at the type map:

```mjs displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'orama-db'],

  global: {
    project: 'Kittens',
    repository: 'you/kittens',
    input: ['docs/**/*.md'],
    output: 'out',
  },

  metadata: {
    typeMap: 'docs/api/type-map.json',
  },
};
```

- `input` reads the guides and the reference alike: `docs/**/*.md` includes
  `docs/api/`.
- `metadata.typeMap` links every type annotation naming one of your types to
  its page, in the reference and in your guides.
- `repository` (`owner/name`) turns the source links into links to your
  files on GitHub.

The type map's paths are relative to the folder your `input` glob starts from,
here `docs/`:

```json displayName="docs/api/type-map.json"
{
  "Kitten": "api/interfaces/Kitten"
}
```

These paths have no extension; see
[The type map](./packages/typedoc.md#the-type-map) for what that asks of your
host.

If the reference sits deeper, such as in `docs/reference/api/`, set the
plugin's `docKitBasePath` option to `'reference/api'` so the paths still
match.

In your guides, link to reference pages by their file, and name your types in
braces, as you would anywhere else:

```markdown displayName="docs/index.md"
# Kittens

Call [`adopt()`](./api/functions/adopt.md) to bring home a {Kitten}.
```

Run TypeDoc before each build, for example from a script in your
`package.json`:

```json displayName="package.json"
{
  "scripts": {
    "docs": "typedoc && doc-kit generate"
  }
}
```

`npm run docs` then builds the site into `out/`; preview it as in
[Getting started](./getting-started.md).

## Building the sidebar

Without [`navigation.sidebar`](./generators/html.md#sidebar), the site's
sidebar lists every page in one "API Documentation" group. `pages.json` gives
you what you need to build your own: the name, kind, URL and category of each
reference page.

```json displayName="docs/api/pages.json"
[
  { "name": "Kitten", "kind": "Interface", "url": "/api/interfaces/Kitten" },
  { "name": "adopt", "kind": "Function", "url": "/api/functions/adopt" }
]
```

TypeDoc categorizes the exports of each module and namespace separately: once
one of them has a `@category`, TypeDoc files the others under "Other" (its
`defaultCategory` option). When none has one, their pages have no `category`,
as above.

Read the page list in your configuration, and turn it into sidebar groups.
This one makes a group per category, next to your guides:

```mjs displayName="doc-kit.config.mjs"
import { readFileSync } from 'node:fs';

const pages = JSON.parse(
  readFileSync(new URL('./docs/api/pages.json', import.meta.url), 'utf8')
);

// A group per category, and "Other" for the pages without one
const categories = Object.groupBy(pages, ({ category }) => category ?? 'Other');

export default {
  // ...

  html: {
    navigation: {
      sidebar: [
        {
          groupName: 'Guides',
          items: [{ label: 'Introduction', link: '/index' }],
        },
        ...Object.entries(categories).map(([groupName, entries]) => ({
          groupName,
          items: entries.map(({ name, url }) => ({
            label: `\`${name}\``,
            link: url,
          })),
        })),
      ],
    },
  },
};
```

The configuration reads `pages.json` when it loads, so run TypeDoc first.
[Customizing the site](./customization.md#navigation) covers the rest of the
navigation.

## JavaScript projects

TypeDoc reads JavaScript too, taking the types from its JSDoc comments, once
TypeScript is allowed to: set `allowJs` (or `checkJs`) in your
`tsconfig.json`, and point `entryPoints` at your JavaScript, such as
`src/index.js`.

```json displayName="tsconfig.json"
{
  "compilerOptions": {
    "allowJs": true
  },
  "include": ["src"]
}
```

The types then come from the JSDoc tags:

```js displayName="src/index.js"
/**
 * Adopts a kitten, once the paperwork is done.
 *
 * @param {string} name The kitten's name.
 * @param {object} [options] How to adopt it.
 * @param {string} [options.color] Coat color.
 * @param {AbortSignal} [options.signal] Cancels the adoption.
 * @returns {Promise<{ name: string }>} The adopted kitten.
 * @experimental
 */
export async function adopt(name, options = {}) {
  return { name };
}
```

This gives the same page as the TypeScript version, apart from the return
type, which reads as written: `{Promise<{ name: string }>}`. A `@typedef` of
an object type gets a page of its own, as an interface would.

## Going further

The [`@doc-kit/typedoc` reference](./packages/typedoc.md#options) lists the
plugin's other options: `docKitMemberPages` gives each member of a large
options type a page of its own, `docKitReceivers` changes the name members
are documented on, and `docKitUrlAdapter` keeps the URLs of an earlier site
working. To shape the rest of the site, continue with
[Customizing the site](./customization.md).
