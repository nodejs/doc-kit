# Getting started

This guide takes you from one Markdown file to a documentation site with
search, in a few minutes. Run the commands from your project's root, next to
its `package.json`.

![doc-kit generate writes kittens.html, all.html, 404.html, assets/ and the search index to out/, which any static host serves as is](./diagrams/build-output.svg)

## Install

Install the CLI, and the generators that build the site:

```bash
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
```

`@doc-kit/cli` gives you the `doc-kit` command and the core generators, such
as `json`. `@doc-kit/generator-react` adds the website and what comes with it:
the search index, `llms.txt` and a sitemap.

## Write a page

Create `docs/kittens.md`:

```markdown displayName="docs/kittens.md"
# Kittens

The `kittens` module adopts, feeds, and pets kittens.

## `kittens.adopt(name[, options])`

<!-- YAML
added: v1.0.0
-->

- `name` {string} The kitten's name.
- `options` {Object}
  - `color` {string} Coat color. **Default:** `'tabby'`.
- Returns: {Promise} Fulfills with the adopted kitten.

Adopts a kitten, once the paperwork is done.
```

It's regular Markdown, and reads as such on GitHub. doc-kit also reads the API
in it: the heading is a method with its signature, the list holds its typed
parameters, and the comment is its history.
[Writing documentation](./writing-docs.md) covers the rest.

> [!TIP]
> Documenting a TypeScript or JavaScript project?
> [`@doc-kit/typedoc`](./packages/typedoc.md) writes these pages from your
> source code and its JSDoc comments; see
> [Documenting TypeScript](./typescript.md).

## Configure

Create `doc-kit.config.mjs` next to your `package.json`:

```js displayName="doc-kit.config.mjs"
/** @type {import('@doc-kit/core/utils/configuration/types').Configuration} */
export default {
  target: ['html', 'orama-db'],

  global: {
    project: 'Kittens',
    version: '1.0.0',
    input: ['docs/**/*.md'],
    output: 'out',
  },
};
```

- `target` lists the generators to run: `html` builds the site, and
  `orama-db` its search index.
- `input` takes glob patterns, and `output` is the directory to write to.
- `project` and `version` go into page titles. Without them, doc-kit uses the
  `name` in your `package.json` and the version of Node.js running it.

`target`, `input`, `output` and `version` also have [CLI](./cli.md) flags,
which win over the file. The [configuration reference](./configuration.md)
lists every other option.

## Build and preview

```bash
npx doc-kit generate
```

The site is written to `out/`: one page per Markdown file, plus `all.html`
with every page on one. Its pages load their scripts as modules and hydrate in
the browser, so serve them over HTTP rather than opening the files from disk:

```bash
npx doc-kit preview
```

Then open <http://localhost:3000/kittens.html>. `preview` serves what
`generate` built; pass it any `generate` option, such as
`--config-file doc-kit.config.mjs`, and it builds first. Any other static
server works too, such as `npx serve out`.

> [!TIP]
> Add a `docs/index.md` and it becomes the site's home page, `index.html`.

## Make it yours

To give the site your own logo and colors, add an `html` section to the
configuration that points at a logo component and a stylesheet:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

/** @type {import('@doc-kit/core/utils/configuration/types').Configuration} */
export default {
  // target and global as above

  html: {
    // Your component in place of the project's name
    imports: {
      '#theme/Logo': join(import.meta.dirname, 'theme/Logo.jsx'),
    },

    // Bundled after doc-kit's own styles, so your rules win
    stylesheets: [join(import.meta.dirname, 'theme/styles.css')],
  },
};
```

```jsx displayName="theme/Logo.jsx"
export default () => <strong>Kittens</strong>;
```

```css displayName="theme/styles.css"
:root {
  --color-brand-100: #f7f1fb;
  --color-brand-200: #ead9fb;
  --color-brand-300: #dbbdf9;
  --color-brand-400: #c79bf2;
  --color-brand-500: #b07ae6;
  --color-brand-600: #9756d6;
  --color-brand-700: #7d3cbe;
  --color-brand-800: #642b9e;
  --color-brand-900: #361b52;
}
```

> [!NOTE]
> Theme components are compiled for Preact, so `preact` has to resolve from
> your project. npm usually hoists it there from `@doc-kit/generator-react`;
> with pnpm, add it yourself with `pnpm add --save-dev preact`.

[Customizing the site](./customization.md) covers the other parts of the page
you can replace, and the [Website generator](./generators/html.md) lists every
option.

## Next steps

- [Writing documentation](./writing-docs.md): the conventions that turn
  Markdown into an API reference.
- [Customizing the site](./customization.md): navigation, components, MDX and
  the bundler.
- [Generators](./generators.md): JSON, `llms.txt`, a sitemap, and every
  other output doc-kit can build.
- [Publishing your docs](./publishing.md): hosting, caching and base URLs.
- [Creating generators](./creating-generators.md): outputs of your own.
