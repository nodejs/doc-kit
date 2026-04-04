## `web` Generator

The `web` generator transforms JSX AST entries into complete web bundles, producing server-side rendered HTML pages, client-side JavaScript with code splitting, and bundled CSS styles.

### Configuring

The `web` generator accepts the following configuration options:

| Name           | Type     | Default                                       | Description                                                           |
| -------------- | -------- | --------------------------------------------- | --------------------------------------------------------------------- |
| `output`       | `string` | -                                             | The directory where HTML, JavaScript, and CSS files will be written   |
| `templatePath` | `string` | `'template.html'`                             | Path to the HTML template file                                        |
| `editURL`      | `string` | `'${GITHUB_EDIT_URL}/doc/api{path}.md'`       | URL template for "edit this page" links                               |
| `pageURL`      | `string` | `'{baseURL}/latest-{version}/api{path}.html'` | URL template for documentation page links                             |
| `imports`      | `object` | See below                                     | Object mapping `#theme/` aliases to component paths for customization |

#### Default `imports`

| Alias               | Default                                      | Description                                  |
| ------------------- | -------------------------------------------- | -------------------------------------------- |
| `#theme/Logo`       | `@node-core/ui-components/Common/NodejsLogo` | Logo rendered inside the navigation bar      |
| `#theme/Navigation` | Built-in `NavBar` component                  | Top navigation bar                           |
| `#theme/Sidebar`    | Built-in `SideBar` component                 | Sidebar with version selector and page links |
| `#theme/Layout`     | Built-in `Layout` component                  | Outermost wrapper around the full page       |

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
import { title, repository, editURL } from '#theme/config';
```

#### Available exports

| Export                   | Type                                            | Description                                                                                           |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `title`                  | `string`                                        | Site title (e.g. `'Node.js'`)                                                                         |
| `repository`             | `string`                                        | GitHub repository in `owner/repo` format                                                              |
| `version`                | `string`                                        | Current version label (e.g. `'v22.x'`)                                                                |
| `versions`               | `Array<{ url, label, major }>`                  | Pre-computed version entries with labels and URL templates (only `{path}` remains for per-page use)   |
| `editURL`                | `string`                                        | Partially populated "edit this page" URL template (only `{path}` remains)                             |
| `pages`                  | `Array<[number, { heading, path, category? }]>` | Sorted `[weight, page]` tuples for sidebar navigation (explicit weights first, then default ordering) |
| `languageDisplayNameMap` | `Map<string, string>`                           | Shiki language alias → display name map for code blocks                                               |

#### Usage in custom components

When overriding a `#theme/*` component, import only the config values you need:

```jsx
// my-custom-sidebar.jsx
import { pages, versions, version } from '#theme/config';

export default ({ metadata }) => (
  <nav>
    <p>Current: {version}</p>
    <ul>
      {pages.map(([weight, page]) => (
        <li key={page.path} data-weight={weight}>
          <a href={`${page.path}.html`}>{page.heading}</a>
        </li>
      ))}
    </ul>
  </nav>
);
```

If a page defines `weight` in frontmatter, lower values are listed first.
Pages without `weight` use `-1` and keep the default upstream ordering.

### Layout props

The `Layout` component receives the following props:

| Prop          | Type                | Description                                                                                                                       |
| ------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `metadata`    | `object`            | Serialized page metadata — all YAML frontmatter properties plus `addedIn`, `basename`, `path`, and any custom user-defined fields |
| `headings`    | `Array`             | Pre-computed table of contents heading entries                                                                                    |
| `readingTime` | `string`            | Estimated reading time (e.g. `'5 min read'`)                                                                                      |
| `children`    | `ComponentChildren` | Processed page content                                                                                                            |

Custom Layout components can use any combination of these props alongside `#theme/config` imports.
