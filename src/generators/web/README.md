## `web` Generator

The `web` generator transforms JSX AST entries into complete web bundles, producing server-side rendered HTML pages, client-side JavaScript with code splitting, and bundled CSS styles.

### Configuring

The `web` generator accepts the following configuration options:

| Name              | Type      | Default                                       | Description                                                           |
| ----------------- | --------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `output`          | `string`  | -                                             | The directory where HTML, JavaScript, and CSS files will be written   |
| `templatePath`    | `string`  | `'template.html'`                             | Path to the HTML template file                                        |
| `project`         | `string`  | `'Node.js'`                                   | Project name used in page titles and the version selector             |
| `title`           | `string`  | `'{project} v{version} Documentation'`        | Title template for HTML pages (supports `{project}`, `{version}`)     |
| `useAbsoluteURLs` | `boolean` | `false`                                       | When `true`, all internal links use absolute URLs based on `baseURL`  |
| `editURL`         | `string`  | `'${GITHUB_EDIT_URL}/doc/api{path}.md'`       | URL template for "edit this page" links                               |
| `pageURL`         | `string`  | `'{baseURL}/latest-{version}/api{path}.html'` | URL template for documentation page links                             |
| `head`            | `object`  | See below                                     | Configurable `<meta>`, `<link>`, and raw markup for the document head |
| `lightningcss`    | `object`  | `{}`                                          | Options spread into LightningCSS while bundling CSS (see below)       |
| `imports`         | `object`  | See below                                     | Object mapping `#theme/` aliases to component paths for customization |
| `virtualImports`  | `object`  | `{}`                                          | Additional virtual module mappings merged into the build              |

#### `head`

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
> via `head`: `og:title` (mirrors the per-page title), `og:type`, and the font
> preconnects/stylesheet the bundled UI components rely on.

#### Custom LightningCSS options

The `lightningcss` object is spread directly into [LightningCSS][lightningcss]
while CSS is bundled, so any of its options — `visitor` (custom plugins),
`customAtRules`, `targets`, `drafts`, and so on — are supported. The generator
manages `filename`, `code`, `cssModules`, and `resolver`, so those are ignored.

```js
// doc-kit.config.mjs
export default {
  web: {
    lightningcss: {
      customAtRules: {
        mixin: { prelude: '<custom-ident>', body: 'style-block' },
      },
      visitor: {
        Color(color) {
          // e.g. transform every color through a design-token map
          return color;
        },
      },
    },
  },
};
```

To apply more than one visitor, compose them with LightningCSS's
`composeVisitors` helper and pass the result as `visitor`.

[lightningcss]: https://lightningcss.dev/transforms.html

#### Default `imports`

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

### `#theme/config` virtual module

The `web` generator provides a `#theme/config` virtual module that exposes pre-computed configuration as named exports. Any component (including custom overrides) can import the values it needs, and tree-shaking removes the rest.

```js
import { project, repository, editURL } from '#theme/config';
```

#### Available exports

All scalar (non-object) configuration values are automatically exported. The defaults include:

| Export                   | Type                           | Description                                                                                         |
| ------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `project`                | `string`                       | Project name (e.g. `'Node.js'`)                                                                     |
| `repository`             | `string`                       | GitHub repository in `owner/repo` format                                                            |
| `version`                | `string`                       | Current version label (e.g. `'v22.x'`)                                                              |
| `versions`               | `Array<{ url, label, major }>` | Pre-computed version entries with labels and URL templates (only `{path}` remains for per-page use) |
| `editURL`                | `string`                       | Partially populated "edit this page" URL template (only `{path}` remains)                           |
| `pages`                  | `Array<[string, string]>`      | Sorted `[name, path]` tuples for sidebar navigation                                                 |
| `useAbsoluteURLs`        | `boolean`                      | Whether internal links use absolute URLs (mirrors config value)                                     |
| `baseURL`                | `string`                       | Base URL for the documentation site (used when `useAbsoluteURLs` is `true`)                         |
| `languageDisplayNameMap` | `Map<string, string>`          | Shiki language alias → display name map for code blocks                                             |

#### Usage in custom components

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

### Layout props

The `Layout` component receives the following props:

| Prop          | Type                | Description                                                                                                                       |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `metadata`    | `object`            | Serialized page metadata — all YAML frontmatter properties plus `addedIn`, `basename`, `path`, and any custom user-defined fields |
| `headings`    | `Array`             | Pre-computed table of contents heading entries                                                                                    |
| `readingTime` | `string`            | Estimated reading time (e.g. `'5 min read'`)                                                                                      |
| `children`    | `ComponentChildren` | Processed page content                                                                                                            |

Custom Layout components can use any combination of these props alongside `#theme/config` imports.

### HTML template

The HTML template file (set via `templatePath`) uses JavaScript template literal syntax (`${...}` placeholders) and is evaluated at build time with full expression support.

#### Available template variables

| Variable           | Type     | Description                                                       |
| ------------------ | -------- | ----------------------------------------------------------------- |
| `title`            | `string` | Fully resolved page title (e.g. `'File system \| Node.js v22.x'`) |
| `dehydrated`       | `string` | Server-rendered HTML for the page content                         |
| `importMap`        | `string` | JSON import map for client-side module resolution                 |
| `entrypoint`       | `string` | Client-side entry point filename with cache-bust query            |
| `speculationRules` | `string` | Speculation rules JSON for prefetching                            |
| `root`             | `string` | Relative or absolute path to the site root                        |
| `metadata`         | `object` | Full page metadata (frontmatter, path, heading, etc.)             |
| `config`           | `object` | The resolved web generator configuration                          |
| `head`             | `string` | Pre-rendered `<meta>`/`<link>`/raw markup from the `head` config  |

Since the template supports arbitrary JS expressions, you can use conditionals and method calls:

```html
<title>${title}</title>
<link rel="stylesheet" href="${root}styles.css" />
<script type="importmap">
  ${importMap}
</script>
```
