# `web` Generator

The `web` generator transforms JSX AST entries into complete web bundles. Vite
builds server-rendered HTML and hashed client-side JavaScript, CSS, and imported
assets, then writes the complete static site to `output`. The generator is
output-only and does not return an in-memory copy of its HTML or CSS.

## Configuring

The `web` generator accepts the following configuration options:

| Name              | Type         | Default                                       | Description                                                                                                 |
| ----------------- | ------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `output`          | `string`     | Required                                      | The directory where HTML and Vite's hashed client output are written                                        |
| `templatePath`    | `string`     | `'template.html'`                             | Path to the HTML template file                                                                              |
| `project`         | `string`     | `'Node.js'`                                   | Project name used in page titles and the version selector                                                   |
| `title`           | `string`     | `'{project} v{version} Documentation'`        | Title template for HTML pages (supports `{project}`, `{version}`)                                           |
| `useAbsoluteURLs` | `boolean`    | `false`                                       | When `true`, all internal links use absolute URLs based on `baseURL`                                        |
| `editURL`         | `string`     | `'${GITHUB_EDIT_URL}/doc/api{path}.md'`       | URL template for "edit this page" links                                                                     |
| `pageURL`         | `string`     | `'{baseURL}/latest-{version}/api{path}.html'` | URL template for documentation page links                                                                   |
| `remoteConfigUrl` | `string`     | `'https://nodejs.org/site.json'`              | URL fetched client-side at runtime for remote site config (currently used to power the announcement banner) |
| `head`            | `object`     | See below                                     | Configurable `<meta>`, `<link>`, and raw markup for the document head                                       |
| `imports`         | `object`     | See below                                     | Object mapping `#theme/` aliases to component paths for customization                                       |
| `virtualImports`  | `object`     | `{}`                                          | Additional virtual module mappings merged into both Vite builds                                             |
| `components`      | `object`     | `{}`                                          | Maps JSX tag names to component imports, enabling JSX-in-MDX (see below)                                    |
| `vite`            | `UserConfig` | `{}`                                          | Vite configuration merged into the client and SSR builds (see below)                                        |

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

### Custom Vite options

The `vite` object is merged into both production builds. This supports Vite
plugins, aliases, `define`, asset options, and native Lightning CSS settings.
Use `import.meta.env.SSR` inside application code or plugin transforms when
behavior must differ between the SSR and browser builds.

```js
// doc-kit.config.mjs
import myVitePlugin from './my-vite-plugin.mjs';

export default {
  web: {
    vite: {
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
    },
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

Vite manifests are optional. Set `web.vite.build.manifest` to `true` or a file
name when another tool needs one. The generated HTML already references the
correct hashed scripts, stylesheets, imported assets, and module preloads.

Function-valued plugins and hooks are supported because the `web` generator
runs on the main thread and does not serialize this configuration to a worker.

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
| `entrypoint`       | `string` | Virtual Vite module for this page's client hydration              |
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

Vite processes each populated template as an HTML entry. It replaces the
virtual `entrypoint` with the hashed client script and injects that page's
stylesheets and module preloads in their required order.
