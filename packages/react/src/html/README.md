# `html` Generator

The `html` generator transforms JSX AST entries into complete web bundles. Its
bundler adapter builds server-rendered HTML and client-side JavaScript, CSS, and
imported assets, then writes the complete static site to `output`. Vite is the
default adapter, but projects can supply an adapter for webpack or another
bundler. The generator is output-only and does not return an in-memory copy of
its HTML or CSS.

## Configuring

- `output` {string} The directory where HTML and bundled client output are
  written. Required.
- `templatePath` {string} Path to the HTML template file.
  **Default:** `'template.html'`.
- `project` {string} Project name used in page titles and the version selector.
  **Default:** inherited from `global.project`.
- `title` {string} Title template for HTML pages (supports `{project}`,
  `{version}`). **Default:** `'{project} v{version} Documentation'`.
- `useAbsoluteURLs` {boolean} When `true`, all internal links use absolute URLs
  based on `baseURL`. **Default:** `false`.
- `editURL` {string} URL template for "edit this page" links.
  **Default:** none — the "edit this page" link is omitted.
- `pageURL` {string} URL template for documentation page links.
  **Default:** `'{baseURL}{path}.html'`.
- `remoteConfigUrl` {string} URL fetched client-side at runtime for remote site
  config (currently used to power the announcement banner).
  **Default:** none — no runtime fetch, no banner.
- `head` {Object} Configurable `<meta>`, `<link>`, and raw markup for the
  document head. See [`head`](#head).
- `stylesheets` {Array} Paths to extra stylesheets bundled after the built-in
  one. See [`stylesheets`](#stylesheets). **Default:** `[]`.
- `imports` {Object} Object mapping `#theme/` aliases to component paths for
  customization. See [Default `imports`](#default-imports).
- `virtualImports` {Object} Additional virtual module mappings supplied to the
  server and client builds. **Default:** `{}`.
- `components` {Object} Maps JSX tag names to component imports, enabling
  JSX-in-MDX. See [`components`](#components). **Default:** `{}`.
- `navigation` {Object} Sidebar groups and navigation bar items. See
  [`navigation`](#navigation). **Default:** `{}`.
- `bundler` {WebBundler} Adapter that renders server entries and writes the
  client and HTML output. See [Bundler adapters](#bundler-adapters).
  **Default:** `createViteBundler()`.

### `head`

- `meta` {Array} `<meta>` tags. Each entry is an attribute bag, e.g.
  `{ name: 'description', content: '…' }`.
- `links` {Array} `<link>` tags. Each entry is an attribute bag, e.g.
  `{ rel: 'icon', href: '…' }`.
- `html` {Array} Raw HTML strings appended verbatim — an escape hatch for
  anything not expressible above.

The `head` object controls the project-specific markup injected into the
document `<head>` (rendered into the template's `${head}` placeholder).

Each attribute bag is rendered as a tag: a boolean `true` becomes a valueless
attribute (e.g. `crossorigin`), and `false`/`null`/`undefined` attributes are
omitted. Using arrays of attribute bags (rather than `name → value` maps) means
you can emit repeated tags (e.g. two `preconnect` links) and pick the right
attribute (`name` vs `property`) per tag.

The default `head` is empty — brand the output by supplying your own tags:

```js
// doc-kit.config.mjs
export default {
  html: {
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

### `stylesheets`

Each entry is a path to a CSS file, bundled into the site's single stylesheet
after the built-in one — so its rules and custom properties win. Relative paths
resolve against the working directory; prefer absolute paths (e.g.
`join(import.meta.dirname, 'theme.css')`) when the config file can be loaded
from elsewhere.

The built-in accent palette is a project-neutral grey. Rebrand the output by
redefining the nine `--color-brand-*` custom properties, which the UI components
use for links, focus rings, and active states:

```css
/* theme.css */
:root {
  --color-brand-100: #edf2eb;
  --color-brand-200: #c5e5b4;
  --color-brand-300: #99cc7d;
  --color-brand-400: #84ba64;
  --color-brand-500: #5fa04e;
  --color-brand-600: #417e38;
  --color-brand-700: #2c682c;
  --color-brand-800: #2c682c;
  --color-brand-900: #1a3f1d;
}
```

```js
// doc-kit.config.mjs
import { join } from 'node:path';

export default {
  html: {
    stylesheets: [join(import.meta.dirname, 'theme.css')],
  },
};
```

### `navigation`

- `sidebar` {Array} Sidebar groups, each `{ groupName, items }`. Defaults to one
  `API Documentation` group holding every page.
- `navbar` {Array} Navigation bar items, each `{ text, link, target? }`.
  Defaults to none, which renders no items.

The `navigation` object supplies the site's two navigation surfaces. Both keys
are optional; omit either one to keep that component's default.

Sidebar items are `{ label, link }` and may nest through an `items` array of
their own. A `label` is plain text, except that backticked spans render as
`<code>` (``'`fs`'``), matching how page headings are rendered. A `link` is a
page path without its extension (`/fs`, `/generators/html`): it is resolved
against the page being rendered, so it obeys `useAbsoluteURLs` and highlights
while it is the current page. Links starting with `http://` or `https://` are
used as authored.

Navigation bar links are always used as authored, since they typically point
outside the generated site. Give them a `target` of `'_blank'` to open in a new
tab and mark them with an external-link icon.

```js
// doc-kit.config.mjs
export default {
  html: {
    navigation: {
      sidebar: [
        {
          groupName: 'Guides',
          items: [{ label: 'Getting started', link: '/getting-started' }],
        },
        {
          groupName: 'Reference',
          items: [{ label: '`fs`', link: '/fs' }],
        },
      ],
      navbar: [
        { text: 'Learn', link: 'https://nodejs.org/en/learn' },
        { text: 'Download', link: 'https://nodejs.org/en/download' },
      ],
    },
  },
};
```

The sidebar also renders a version `<Select>` built from `changelog`. A site
configured without one has no versions to switch between, so the control is
omitted rather than rendered empty.

### Bundler adapters

- `getEntryId` {Function} Return the module identifier placed in the populated
  HTML for an API name.
- `render` {Function} Bundle and execute the server `entries`, returning a `Map`
  of API name to rendered HTML.
- `build` {Function} Bundle the client `entries`, process the populated `pages`,
  and write the complete output.

The `bundler` option accepts a small Doc Kit adapter rather than configuration
for a particular build system.

Both `render` and `build` receive `{ entries, virtualImports, config }`; `build`
also receives `pages`. Entry maps use `${api}.jsx` keys, rendered server results
use `api` keys, and page maps use output-relative HTML file names. `config` is
the resolved `html` configuration.

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
  html: {
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
import { createViteBundler } from '@doc-kit/generator-react/html/bundlers/vite';
import myVitePlugin from './my-vite-plugin.mjs';

export default {
  html: {
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

Function-valued plugins and hooks are supported because the `html` generator
runs on the main thread and does not serialize the bundler to a worker.

### Default `imports`

- `#theme/Logo` {string} Logo rendered inside the navigation bar. Defaults to
  the built-in `ProjectName` component, which renders `project` as plain text.
- `#theme/Navigation` {string} Top navigation bar. Defaults to the built-in
  `NavBar` component.
- `#theme/Sidebar` {string} Sidebar with version selector and page links.
  Defaults to the built-in `SideBar` component.
- `#theme/Metabar` {string} Metadata bar displayed alongside page content.
  Defaults to the built-in `MetaBar` component.
- `#theme/Footer` {string} Optional footer rendered at the bottom of each page.
  Defaults to the built-in `NoOp` component, which renders nothing.
- `#theme/Layout` {string} Outermost wrapper around the full page. Defaults to
  the built-in `Layout` component.

Override any alias in your config file to swap in a custom component:

```js
// doc-kit.config.mjs
export default {
  html: {
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
  html: {
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

The built-in components are available without registration. Notably,
`<DocumentationIndex />` renders an index of every documented module with its
stability badge and description, sourced from the `documentationIndex` export
of [`#theme/config`](#themeconfig-virtual-module).

## `#theme/config` virtual module

The `html` generator provides a `#theme/config` virtual module that exposes pre-computed configuration as named exports. Any component (including custom overrides) can import the values it needs, and tree-shaking removes the rest.

```js
import { project, repository, editURL } from '#theme/config';
```

### Available exports

- `project` {string} Project name (e.g. `'Node.js'`).
- `repository` {string} GitHub repository in `owner/repo` format, or
  `undefined` when none is configured.
- `version` {string} Current version label (e.g. `'v22.x'`).
- `versions` {Array} Pre-computed version entries, each `{ url, label, major }`,
  with labels and URL templates (only `{path}` remains for per-page use).
- `editURL` {string} Partially populated "edit this page" URL template (only
  `{path}` remains).
- `pages` {Array} Sorted `[name, path]` tuples for sidebar navigation.
- `documentationIndex` {Array} Entries rendered by the built-in
  `<DocumentationIndex />` component — every page with a stability index, each
  `{ api, name, index, description }`.
- `navigation` {Object} Mirrors the configured `navigation` (consumed by the
  built-in `SideBar` and `NavBar`).
- `useAbsoluteURLs` {boolean} Whether internal links use absolute URLs (mirrors
  config value).
- `baseURL` {string} Base URL for the documentation site (used when
  `useAbsoluteURLs` is `true`).
- `languageDisplayNameMap` {Map<string, string>} Shiki language alias → display
  name map for code blocks.
- `remoteConfigUrl` {string} Mirrors the configured `remoteConfigUrl` (fetched
  client-side by `RemoteLoadableBanner` to load announcement banners).
- `server` {boolean} Whether the current bundle is the server build.

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

- `metadata` {Object} Serialized page metadata — all YAML frontmatter properties
  plus `addedIn`, `basename`, `path`, and any custom user-defined fields.
- `headings` {Array} Pre-computed table of contents heading entries.
- `readingTime` {string} Estimated reading time (e.g. `'5 min read'`).
- `children` {ComponentChildren} Processed page content.

The `Layout` component receives the props above. Custom Layout components can use
any combination of them alongside `#theme/config` imports.

## HTML template

The HTML template file (set via `templatePath`) uses JavaScript template literal syntax (`${...}` placeholders) and is evaluated at build time with full expression support.

### Available template variables

- `title` {string} Fully resolved page title (e.g.
  `'File system | Node.js v22.x'`).
- `dehydrated` {string} Server-rendered HTML for the page content.
- `entrypoint` {string} Adapter-provided module identifier for this page's
  hydration.
- `speculationRules` {string} Speculation rules JSON for prefetching.
- `themeScript` {string} Inline script that applies the saved theme before paint.
- `root` {string} Relative or absolute path to the site root.
- `metadata` {Object} Full page metadata (frontmatter, path, heading, etc.).
- `config` {Object} The resolved `html` generator configuration.
- `head` {string} Pre-rendered `<meta>`/`<link>`/raw markup from the `head`
  config.

Since the template supports arbitrary JS expressions, you can use conditionals and method calls:

```html
<title>${title}</title>
<script type="module" src="${entrypoint}"></script>
```

The configured adapter processes each populated page. It must replace or
resolve `entrypoint`, include that page's scripts and stylesheets, and write the
final HTML.
