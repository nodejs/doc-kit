# `web` Generator

The `web` generator transforms JSX AST entries into complete web bundles. Its
bundler adapter builds server-rendered HTML and client-side JavaScript, CSS, and
imported assets, then writes the complete static site to `output`. Vite is the
default adapter, but projects can supply an adapter for webpack or another
bundler. The generator is output-only and does not return an in-memory copy of
its HTML or CSS.

## Configuring

The `web` generator accepts the following configuration options:

| Name              | Type         | Default                                       | Description                                                                                                 |
| ----------------- | ------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `output`          | `string`     | Required                                      | The directory where HTML and bundled client output are written                                              |
| `templatePath`    | `string`     | `'template.html'`                             | Path to the HTML template file                                                                              |
| `project`         | `string`     | `'Node.js'`                                   | Project name used in page titles and the version selector                                                   |
| `title`           | `string`     | `'{project} v{version} Documentation'`        | Title template for HTML pages (supports `{project}`, `{version}`)                                           |
| `useAbsoluteURLs` | `boolean`    | `false`                                       | When `true`, all internal links use absolute URLs based on `baseURL`                                        |
| `editURL`         | `string`     | `'${GITHUB_EDIT_URL}/doc/api{path}.md'`       | URL template for "edit this page" links                                                                     |
| `pageURL`         | `string`     | `'{baseURL}/latest-{version}/api{path}.html'` | URL template for documentation page links                                                                   |
| `remoteConfigUrl` | `string`     | `'https://nodejs.org/site.json'`              | URL fetched client-side at runtime for remote site config (currently used to power the announcement banner) |
| `head`            | `object`     | See below                                     | Configurable `<meta>`, `<link>`, and raw markup for the document head                                       |
| `imports`         | `object`     | See below                                     | Object mapping `#theme/` aliases to component paths for customization                                       |
| `virtualImports`  | `object`     | `{}`                                          | Additional virtual module mappings supplied to the server and client builds                                 |
| `components`      | `object`     | `{}`                                          | Maps JSX tag names to component imports, enabling JSX-in-MDX (see below)                                    |
| `bundler`         | `WebBundler` | Vite adapter                                  | Adapter that renders server entries and writes the client and HTML output (see below)                       |

### `head`

The `head` object controls the project-specific markup injected into the
document `<head>` (rendered into the template's `${head}` placeholder). It has
three keys:

| Key     | Type    | Description                                                                                 |
| ------- | ------- | ------------------------------------------------------------------------------------------- |
| `meta`  | `array` | `<meta>` tags. Each entry is an attribute bag, e.g. `{ name: 'description', content: '…' }` |
| `links` | `array` | `<link>` tags. Each entry is an attribute bag, e.g. `{ rel: 'icon', href: '…' }`            |
| `html`  | `array` | Raw HTML strings appended verbatim — an escape hatch for anything not expressible above     |

Each attribute bag is rendered as a tag: a boolean `true` becomes a valueless
attribute (e.g. `crossorigin`), and `false`/`null`/`undefined` attributes are
omitted. Using arrays of attribute bags (rather than `name → value` maps) means
you can emit repeated tags (e.g. two `preconnect` links) and pick the right
attribute (`name` vs `property`) per tag.

The defaults are Node.js-branded — override `head` entirely to brand the output
for any project:

```js
// doc-kit.config.mjs
export default {
  web: {
    head: {
      meta: [
        { name: 'description', content: 'My project documentation' },
        { property: 'og:image', content: 'https://example.com/og.png' },
      ],
      links: [
        { rel: 'icon', href: 'https://example.com/favicon.ico' },
        { rel: 'stylesheet', href: 'https://example.com/fonts.css' },
      ],
      html: ['<meta name="theme-color" content="#000" />'],
    },
  },
};
```

> Structural and theme-bound tags are emitted by the template itself rather than
> via `head`, including `og:title` (which mirrors the per-page title) and
> `og:type`. The UI stylesheet bundles its fonts locally.

### Bundler adapters

The `bundler` option accepts a small Doc Kit adapter rather than configuration
for a particular build system:

| Method       | Responsibility                                                                            |
| ------------ | ----------------------------------------------------------------------------------------- |
| `getEntryId` | Return the module identifier placed in the populated HTML for an API name                 |
| `render`     | Bundle and execute the server `entries`, returning a `Map` of API name to rendered HTML   |
| `build`      | Bundle the client `entries`, process the populated `pages`, and write the complete output |

Both `render` and `build` receive `{ entries, virtualImports, config }`; `build`
also receives `pages`. Entry maps use `${api}.jsx` keys, rendered server results
use `api` keys, and page maps use output-relative HTML file names. `config` is
the resolved web configuration.

The adapter must compile the generated Preact JSX and CSS imports and resolve
the supplied theme aliases and virtual modules. The generated `#theme/config`
module exports `server` as `true` for the server build and `false` for the
client build.

A webpack integration can live entirely in project configuration without
adding webpack to Doc Kit:

```js
// webpack-bundler.mjs
export const createWebpackBundler = webpackOptions => ({
  getEntryId: api => `virtual:doc-kit/client/${api}.jsx`,

  async render({ entries, virtualImports, config }) {
    // Materialize or load the in-memory modules, run webpack's server target,
    // execute each emitted entry, and return Map<api, renderedHtml>.
  },

  async build({ entries, virtualImports, pages, config }) {
    // Run webpack's browser target, inject its emitted assets into `pages`,
    // and write the HTML and assets to config.output.
  },
});
```

```js
// doc-kit.config.mjs
import { createWebpackBundler } from './webpack-bundler.mjs';

export default {
  web: {
    bundler: createWebpackBundler({
      // Project-owned webpack configuration.
    }),
  },
};
```

### Vite adapter

When `bundler` is omitted, the generator imports and uses
`createViteBundler()` automatically. To customize Vite, import the adapter
directly and pass Vite's `UserConfig` to it:

```js
// doc-kit.config.mjs
import { createViteBundler } from '@node-core/doc-kit/src/generators/web/bundlers/vite.mjs';
import myVitePlugin from './my-vite-plugin.mjs';

export default {
  web: {
    bundler: createViteBundler({
      plugins: [myVitePlugin()],
      define: {
        'process.env.ANALYTICS_ID': JSON.stringify('UA-XXXXX'),
      },
      resolve: {
        alias: {
          '@components': './src/components',
        },
      },
      css: {
        lightningcss: {
          targets: {
            chrome: 100 << 16,
          },
        },
      },
    }),
  },
};
```

The generator owns the fields required to coordinate its builds: config-file
loading, app type and base, virtual inputs, Preact compatibility aliases and
automatic JSX runtime, the Lightning CSS transformer, output/write mode, SSR
format and temporary output, and SSR dependency bundling. Values supplied for
those fields are replaced after configuration is merged. User plugins are
registered after the generator's virtual-module plugin; other Vite options are
preserved.

Vite manifests are optional. Pass `build: { manifest: true }` or a manifest file
name to `createViteBundler` when another tool needs one. The generated HTML
already references the correct hashed scripts, stylesheets, imported assets,
and module preloads.

Function-valued plugins and hooks are supported because the `web` generator
runs on the main thread and does not serialize the bundler to a worker.

### Default `imports`

| Alias               | Default                                      | Description                                         |
| ------------------- | -------------------------------------------- | --------------------------------------------------- |
| `#theme/Logo`       | `@node-core/ui-components/Common/NodejsLogo` | Logo rendered inside the navigation bar             |
| `#theme/Navigation` | Built-in `NavBar` component                  | Top navigation bar                                  |
| `#theme/Sidebar`    | Built-in `SideBar` component                 | Sidebar with version selector and page links        |
| `#theme/Metabar`    | Built-in `MetaBar` component                 | Metadata bar displayed alongside page content       |
| `#theme/Footer`     | Built-in `NoOp` component (renders nothing)  | Optional footer rendered at the bottom of each page |
| `#theme/Layout`     | Built-in `Layout` component                  | Outermost wrapper around the full page              |

Override any alias in your config file to swap in a custom component:

```js
// doc-kit.config.mjs
export default {
  web: {
    imports: {
      '#theme/Logo': './src/MyLogo.jsx',
      '#theme/Sidebar': './src/MySidebar.jsx',
    },
  },
};
```

## `components`

`components` registers custom JSX components so they can be used directly in
content (see [JSX-in-MDX](#jsx-in-mdx) below). Each entry maps a JSX tag name to
an import descriptor (`{ name, source, isDefaultExport? }`, the same shape as the
built-in `JSX_IMPORTS`). A `Tag: 'source'` string shorthand expands to
`{ name: Tag, source }` with a default export. Registered components are merged
with the built-ins, and a matching `imports` alias resolves the `source` to a
real module path:

```js
// doc-kit.config.mjs
export default {
  web: {
    components: {
      // Shorthand — equivalent to { name: 'Hero', source: '#theme/Hero' }
      Hero: '#theme/Hero',
      // Full descriptor
      Stats: { name: 'Stats', source: '#theme/Stats' },
    },
    imports: {
      '#theme/Hero': './src/components/Hero.jsx',
      '#theme/Stats': './src/components/Stats.jsx',
    },
  },
};
```

## JSX-in-MDX

By default every input file is parsed as Markdown, where bare `<` and `{` are
treated literally (Node.js core docs use `<string>`-style type annotations). To
author real JSX — `<Hero />`, `{expression}` — use an **`.mdx`** file, or set
`mdx: true` in a file's `---` frontmatter (frontmatter wins, so `mdx: false`
opts a `.mdx` file back out). MDX files are parsed with `remark-mdx` and skip the
API-doc type/signature parsing; headings, frontmatter, TOC, and sidebar still
work. Reference any component registered via `components`:

```mdx
---
title: Welcome
---

# Welcome

<Hero title="Node.js" />

There are {stats.length} APIs documented.
```

## `#theme/config` virtual module

The `web` generator provides a `#theme/config` virtual module that exposes pre-computed configuration as named exports. Any component (including custom overrides) can import the values it needs, and tree-shaking removes the rest.

```js
import { project, repository, editURL } from '#theme/config';
```

### Available exports

All scalar (non-object) configuration values are automatically exported. The defaults include:

| Export                   | Type                           | Description                                                                                                           |
| ------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `project`                | `string`                       | Project name (e.g. `'Node.js'`)                                                                                       |
| `repository`             | `string`                       | GitHub repository in `owner/repo` format                                                                              |
| `version`                | `string`                       | Current version label (e.g. `'v22.x'`)                                                                                |
| `versions`               | `Array<{ url, label, major }>` | Pre-computed version entries with labels and URL templates (only `{path}` remains for per-page use)                   |
| `editURL`                | `string`                       | Partially populated "edit this page" URL template (only `{path}` remains)                                             |
| `pages`                  | `Array<[string, string]>`      | Sorted `[name, path]` tuples for sidebar navigation                                                                   |
| `useAbsoluteURLs`        | `boolean`                      | Whether internal links use absolute URLs (mirrors config value)                                                       |
| `baseURL`                | `string`                       | Base URL for the documentation site (used when `useAbsoluteURLs` is `true`)                                           |
| `languageDisplayNameMap` | `Map<string, string>`          | Shiki language alias → display name map for code blocks                                                               |
| `remoteConfigUrl`        | `string`                       | Mirrors the configured `remoteConfigUrl` (fetched client-side by `RemoteLoadableBanner` to load announcement banners) |
| `server`                 | `boolean`                      | Whether the current bundle is the server build                                                                        |

### Usage in custom components

When overriding a `#theme/*` component, import only the config values you need:

```jsx
// my-custom-sidebar.jsx
import { pages, versions, version } from '#theme/config';

export default ({ metadata }) => (
  <nav>
    <p>Current: {version}</p>
    <ul>
      {pages.map(([name, path]) => (
        <li key={path}>
          <a href={`${path}.html`}>{name}</a>
        </li>
      ))}
    </ul>
  </nav>
);
```

## Layout props

The `Layout` component receives the following props:

| Prop          | Type                | Description                                                                                                                       |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `metadata`    | `object`            | Serialized page metadata — all YAML frontmatter properties plus `addedIn`, `basename`, `path`, and any custom user-defined fields |
| `headings`    | `Array`             | Pre-computed table of contents heading entries                                                                                    |
| `readingTime` | `string`            | Estimated reading time (e.g. `'5 min read'`)                                                                                      |
| `children`    | `ComponentChildren` | Processed page content                                                                                                            |

Custom Layout components can use any combination of these props alongside `#theme/config` imports.

## HTML template

The HTML template file (set via `templatePath`) uses JavaScript template literal syntax (`${...}` placeholders) and is evaluated at build time with full expression support.

### Available template variables

| Variable           | Type     | Description                                                       |
| ------------------ | -------- | ----------------------------------------------------------------- |
| `title`            | `string` | Fully resolved page title (e.g. `'File system \| Node.js v22.x'`) |
| `dehydrated`       | `string` | Server-rendered HTML for the page content                         |
| `entrypoint`       | `string` | Adapter-provided module identifier for this page's hydration      |
| `speculationRules` | `string` | Speculation rules JSON for prefetching                            |
| `themeScript`      | `string` | Inline script that applies the saved theme before paint           |
| `root`             | `string` | Relative or absolute path to the site root                        |
| `metadata`         | `object` | Full page metadata (frontmatter, path, heading, etc.)             |
| `config`           | `object` | The resolved web generator configuration                          |
| `head`             | `string` | Pre-rendered `<meta>`/`<link>`/raw markup from the `head` config  |

Since the template supports arbitrary JS expressions, you can use conditionals and method calls:

```html
<title>${title}</title>
<script type="module" src="${entrypoint}"></script>
```

The configured adapter processes each populated page. It must replace or
resolve `entrypoint`, include that page's scripts and stylesheets, and write the
final HTML.
