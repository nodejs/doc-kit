# Website

The `html` generator builds your docs into a static website: one
server-rendered page per document, with search, a sidebar, light and dark
themes, and client-side navigation. This page is the reference;
[Customizing the site](https://doc-kit.nodejs.org/customization) walks through
changing its look.

## Usage

```bash
npx @doc-kit/cli generate -t html -t orama-db -i "docs/**/*.md" -o out
```

`orama-db` adds the [search index](https://doc-kit.nodejs.org/generators/orama-db)
for the search box. The pages load their scripts as modules, so serve `out/`
over HTTP (`npx @doc-kit/cli preview`) rather than opening it from disk.
[Publishing your docs](https://doc-kit.nodejs.org/publishing) covers hosting.

| Path                      | Contents                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `<page>.html`             | One page per input document, at its path from the input glob's base: `docs/api/fs.md` becomes `api/fs.html`.                |
| `all.html`                | Every module page's content on one page, while `generateAllPage` is on.                                                     |
| `404.html`                | The not-found page, while the `jsx-ast` option `generateNotFoundPage` is on.                                                |
| `assets/`                 | The client scripts, stylesheet and fonts. The Vite adapter names each after a hash of its content, so hosts can cache them. |
| `<module>/<section>.html` | One page per section, when [`section-pages`](https://doc-kit.nodejs.org/generators/section-pages) runs in the same build.   |

It then copies the paths in
[`pathsToCopy`](https://doc-kit.nodejs.org/configuration#global-options) into
the output.

## Configuring

Several options are
[templates](https://doc-kit.nodejs.org/configuration#generator-options), with
the placeholders described below.

- `title` {string} Template for the site part of each page's `<title>`, which
  follows the page's own title and a `|`. `{version}` is the version without a
  `v` (`22.11.0`). Set it to `''` to title pages with their own title alone.
  **Default:** `'{project} {version} Documentation'`.
- `editURL` {string} Template for each page's "Edit this page" link. `{path}`
  is the page's path without an extension (`/api/fs`; on section pages, their
  module's), and `{version}` the version with a `v` (`v22.11.0`).
  **Default:** none, which leaves the link out.
- `pageURL` {string} Template for a page's URL in another version, which the
  [version selector](#version-selector) links to. `{version}` is each
  release's label, such as `v22.x`, and `{path}` the page's path.
  **Default:** `'{baseURL}{path}.html'`.
- `useAbsoluteURLs` {boolean} Link pages, and load the client assets, through
  absolute URLs under `baseURL` instead of relative ones. **Default:** `false`.
- `showSearchBox` {boolean} Show the search box in the navigation bar. It
  queries the `orama-db.json` that `orama-db` writes to the site root.
  **Default:** `true` when `target` includes `orama-db`, `false` otherwise.
- `navigation` {Object} The sidebar and the navigation bar. See
  [Navigation](#navigation).
  - `sidebar` {Object[]} Sidebar groups. **Default:** one "API Documentation"
    group listing every page.
  - `navbar` {Object[]} Navigation bar links. **Default:** none.
  - `showCrossLinks` {boolean} End each page with links to the previous and
    next sidebar items. **Default:** `false`.
- `remoteConfigUrl` {string} URL of a JSON file the browser fetches for
  announcement banners and an up-to-date version list. See
  [Remote configuration](#remote-configuration). **Default:** none.
- `head` {Object} Tags added to every page's `<head>`. See
  [Head tags](#head-tags).
  - `meta` {Object[]} `<meta>` tags, one attribute object each.
    **Default:** `[]`.
  - `links` {Object[]} `<link>` tags, one attribute object each.
    **Default:** `[]`.
  - `html` {string[]} Raw HTML, added as is. **Default:** `[]`.
- `stylesheets` {string[]} CSS files bundled after the built-in stylesheet.
  See [Stylesheets](#stylesheets). **Default:** `[]`.
- `templatePath` {string} The HTML file every page is rendered into. See
  [HTML template](#html-template). **Default:** the built-in `template.html`.
- `imports` {Object} Module aliases, each mapped to a file or a package. The
  `#theme/*` aliases replace parts of the page. See
  [Theme slots](#theme-slots). **Default:** the six built-in `#theme/*`
  components.
- `components` {Object} Components that MDX pages can use, by tag name. See
  [Components in MDX](#components-in-mdx). **Default:** `{}`.
- `virtualImports` {Object} In-memory modules that components can import, from
  module ID to source code. See [Theme config module](#theme-config-module).
  **Default:** `{}`.
- `generateAllPage` {boolean} Write `all.html`: every module page's content on
  one page, in the default sidebar's order, without section pages and the
  `index` page. **Default:** `true`.
- `bundler` {Object} The adapter that bundles the components and the client
  assets. See [Bundler adapters](#bundler-adapters). **Default:** the Vite
  adapter.

Paths in `stylesheets`, `templatePath` and `imports` resolve against the
working directory. Build them with `join(import.meta.dirname, ...)` to make
them work wherever doc-kit runs from.

The generator also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options),
such as `project`, `repository`, `baseURL`, `version` and `changelog`.

## Navigation

`navigation` configures the sidebar and the navigation bar. Each key is
optional, and leaving one out keeps that part's default:

```js displayName="doc-kit.config.mjs"
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

### Sidebar

`sidebar` is a list of groups, each `{ groupName, items }`. Each item has:

- `label` {string} The item's text. Backticked spans render as code, as in
  page headings.
- `link` {string} A page's path without its extension, such as `/api/kittens`.
  It resolves against the page being rendered, so it follows
  `useAbsoluteURLs`, and it's highlighted on its own page. Links starting with
  `http://` or `https://` are used as written.
- `items` {Object[]} Nested items. An item with `items` renders as a
  disclosure, open on the pages it lists. Its label opens and closes it and
  isn't a link, so list the item's own page again as its first child.

When `section-pages` splits a module, the module's sections are nested under
its item while you're on it, with the module repeated as the first child. An
item with `items` of its own keeps those instead.

Without a `sidebar`, the site has one "API Documentation" group listing every
page, alphabetically by title, with pages named `index`, `synopsis` and
`documentation` first.

### Navigation bar

Each `navbar` item has:

- `text` {string} The link's text.
- `link` {string} The URL, used as written: usually a site-absolute path or
  another site.
- `target` {string} The link's target. `'_blank'` opens a new tab and adds an
  external-link icon.
- `accent` {boolean} Highlights the link.

A site-absolute link shows as the current section on its page and on the pages
under it, so `/api` does on `/api/fs`. The bar also holds the logo, the search
box (see `showSearchBox`), the theme switch and, with a `repository`, a GitHub
link.

### Previous and next links

With `showCrossLinks` on, each page ends with links to the previous and next
items of the sidebar: its groups' top-level items, in order. It needs a
`sidebar`. A module split into section pages always gets these links, on its
own page and its sections', stepping through them in document order.

### Version selector

The sidebar shows a version selector when there are versions to list: the
releases in `changelog`, or the `versions` of the
[remote configuration](#remote-configuration). Each entry links to the current
page in that version through `pageURL`. A page lists only the versions from
the major in its `added` (or `introduced_in`) metadata onwards.

## Remote configuration

`remoteConfigUrl` points at a JSON file the browser fetches once per visit, so
published docs can show news and list newer releases without a rebuild. Both
keys are optional:

```json displayName="site.json"
{
  "websiteBanners": {
    "index": {
      "text": "Kittens 3 is out!",
      "link": "https://example.com/blog/kittens-3",
      "startDate": "2026-11-01",
      "endDate": "2026-12-01"
    },
    "v2": {
      "text": "Kittens 2 reaches its end of life in December.",
      "type": "warning"
    }
  },
  "versions": [
    {
      "url": "https://example.com/docs/v3.x{path}.html",
      "label": "v3.x",
      "major": 3
    },
    {
      "url": "https://example.com/docs/v2.x{path}.html",
      "label": "v2.x",
      "major": 2
    }
  ]
}
```

- `websiteBanners` {Object} Announcement banners, by section: `index` shows on
  every version's docs, and `v<major>`, such as `v2`, only on that major's.
  When both are active, `index` wins.
  - `text` {string} The banner's text.
  - `link` {string} Where the banner links to, opened in a new tab.
  - `type` {string} `'default'`, `'warning'` or `'error'`.
  - `startDate` {string} The date the banner starts showing.
  - `endDate` {string} The date the banner stops showing.
- `versions` {Object[]} Entries that replace the version selector's, so docs
  built for an older release still list the ones that came after it. Each is
  `{ url, label, major }`, with `{path}` in `url` standing for the page's
  path.

A banner the reader dismisses stays hidden until its text changes. If the file
is on another origin, its host must allow cross-origin requests.

## Head tags

`meta` and `links` take one attribute object per tag, so you can repeat a tag
and pick `name` or `property` per tag. A `true` value renders a valueless
attribute, such as `crossorigin`; `false`, `null` and `undefined` leave the
attribute out. `html` holds raw markup for anything else.

```js displayName="doc-kit.config.mjs"
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

The built-in template writes the `<title>`, `og:title` and `og:type` itself,
and the stylesheet bundles its own fonts, so none of them need an entry.

## Stylesheets

`stylesheets` are bundled into the site's stylesheet after the built-in one, so
their rules and custom properties win. They go through the bundler like any
other CSS, so `@import` and `url()` work. The built-in stylesheet reads these
custom properties:

| Property                                   | Sets                                                                                                     | Default        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------- |
| `--color-brand-100` to `--color-brand-900` | The accent color, lightest to darkest, for links, focus rings and active states, in light and dark mode. | A neutral grey |
| `--font-open-sans`                         | The text's font stack.                                                                                   | Open Sans      |
| `--font-ibm-plex-mono`                     | The code's font stack.                                                                                   | IBM Plex Mono  |

Dark mode sets `data-theme="dark"` on `<html>`, from the reader's choice in the
theme switch or their system setting, so scope dark-only rules to
`[data-theme='dark']`. [Colors and fonts](https://doc-kit.nodejs.org/customization#colors-and-fonts)
has a worked example.

## HTML template

`templatePath` points at the HTML file every page is rendered into. It's
evaluated as a JavaScript template literal, so a `${...}` placeholder takes any
expression, and a literal backtick or `${` must be escaped with a backslash.
Start from a copy of the built-in template, at
`node_modules/@doc-kit/generator-react/src/html/template.html`.

These variables are in scope:

- `title` {string} The page's full title, HTML-escaped, such as
  `'File system | Node.js 22.11.0 Documentation'`.
- `head` {string} The tags from the `head` option.
- `assets` {string} The tags that load the client scripts and stylesheet, and
  the data client-side navigation reads. Put it in `<head>`, or pages load no
  script and no stylesheet.
- `preloads` {string} Preload hints for the fonts the bundler reported.
- `themeScript` {string} A script that applies the saved light or dark theme
  before the first paint, for an inline `<script>` in `<head>`.
- `speculationRules` {string} Speculation rules, as JSON, that prefetch
  same-origin links leaving the site when they're hovered or pressed, for a
  `<script type="speculationrules">`. Links within the site navigate
  client-side instead.
- `dehydrated` {string} The server-rendered page, for the `<body>`.
- `root` {string} The site root, relative to the page (such as `'../'`), or
  absolute with `useAbsoluteURLs`. On `404.html` and `all.html`, which can be
  served from any path, it's `'/'` unless `useAbsoluteURLs` is on. Prefix your
  own files with it, as in `${root}favicon.svg`.
- `metadata` {Object} The page's metadata, frontmatter included.
- `config` {Object} The resolved `html` configuration.

Since the template supports arbitrary JS expressions, you can use
conditionals and method calls:

```html displayName="template.html"
<title>${title}</title> ${assets}
```

The filled-in template is the page as written, minified first when `minify` is
on.

## Theme slots

Every page is put together from six components, each imported through a
`#theme/*` alias. Point an alias in `imports` at a component of your own to
replace that part; the aliases you leave out keep their defaults.

| Alias               | Default                                                                   | Props                                             |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- |
| `#theme/Layout`     | `Layout`: the whole page, around the content                              | `metadata`, `headings`, `readingTime`, `children` |
| `#theme/Navigation` | `NavBar`: the logo, links, search box, theme switch and GitHub link       | `metadata`                                        |
| `#theme/Logo`       | `ProjectName`: `project` as plain text                                    | none                                              |
| `#theme/Sidebar`    | `SideBar`: the page links and the version selector                        | `metadata`                                        |
| `#theme/Metabar`    | `MetaBar`: the table of contents, reading time, and "Edit this page" link | `metadata`, `headings`, `readingTime`             |
| `#theme/Footer`     | `NoOp`: nothing                                                           | none                                              |

```js displayName="doc-kit.config.mjs"
export default {
  html: {
    imports: {
      '#theme/Logo': './src/MyLogo.jsx',
      '#theme/Sidebar': './src/MySidebar.jsx',
    },
  },
};
```

- Components are [Preact](https://preactjs.com/) components written in JSX.
  Imports of `react` resolve to `preact/compat`, and components can import CSS
  files and CSS modules.
- An alias can point at a package, such as
  `'@node-core/ui-components/Common/NodejsLogo'`. With the Vite adapter, a
  relative path resolves against Vite's `root`, the working directory by
  default.
- The default layout renders the navigation bar, sidebar, metabar and footer
  slots, and the default navigation bar renders `#theme/Logo`. A component of
  your own renders only the slots it imports, so a custom `#theme/Navigation`
  that leaves out `#theme/Logo` has no logo.
- To wrap or reuse a built-in component, import it from
  `@doc-kit/generator-react/html/ui/components/`, such as `Layout/index.jsx`.

### Layout props

`#theme/Layout` receives:

- `metadata` {Object} The page's metadata: `api`, `path`, `basename`, its
  frontmatter fields (such as `added`, or fields of your own), and, on section
  pages, `chunk`, describing the module and section it was split from. On
  `404.html`, `api` is `'404'`.
- `headings` {Object[]} The table of contents, as
  `{ depth, value, slug, stability, data }` entries.
- `readingTime` {string|undefined} The estimated reading time, such as
  `'5 min read'`. Only set while the `jsx-ast` option `showReadingTime` is on,
  and never on `all.html`.
- `children` {ComponentChildren} The page's rendered content.

[Page layouts](https://doc-kit.nodejs.org/customization#page-layouts) shows a
layout that gives some pages a shape of their own.

## Components in MDX

Pages written in MDX (`.mdx` files, or any page with `mdx: true` in its
frontmatter) can use JSX components. `components` registers yours by tag name,
next to the built-in ones. Each entry is either a module specifier, for the
module's default export, or `{ name, source, isDefaultExport }`, where
`isDefaultExport: false` imports the export called `name`. The source can be
an alias defined in `imports`, a package, or an absolute path:

```js displayName="doc-kit.config.mjs"
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

A page then uses them as tags, such as `<Hero title="Kittens" />`. Each page
imports only the components it uses.

These are built in and need no entry: `AlertBox`, `Badge`, `Blockquote`,
`ChangeHistory`, `CodeBox`, `CodeTabs`, `DataTag`, `FunctionSignature`, the
`MDXTooltip` family, the `ArrowUpRightIcon` icon, and `DocumentationIndex`,
which lists every page with its stability and description.

### Interactive components

Components render to static HTML at build time. To make one interactive, wrap
its export with `withIsland`, which hydrates it in the browser as an island:

```jsx displayName="theme/Counter.jsx"
import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { useState } from 'preact/hooks';

const Counter = ({ start = 0 }) => {
  const [count, setCount] = useState(start);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
};

export default withIsland(Counter, { name: 'Counter', on: { idle: true } });
```

`withIsland(Component, options)` takes:

- `name` {string} The component's tag name in `components`. The browser loads
  islands by that name, so every component that hydrates needs a `components`
  entry, even a theme slot that no page uses as a tag.
- `on` {Object} When the island hydrates: the
  [is-land](https://is-land.11ty.dev/) conditions without their `on:` prefix.
  Required.

A condition set to `true` takes no value:

| Condition                     | Hydrates the island                                                               |
| ----------------------------- | --------------------------------------------------------------------------------- |
| `idle: true`                  | Once the page has loaded and the browser is idle                                  |
| `load: true`                  | Once the page has loaded                                                          |
| `visible: true`               | Once it scrolls into view                                                         |
| `interaction: true`           | On the first click or touch inside it (a string names other events)               |
| `media: '(min-width: 768px)'` | Once the media query matches                                                      |
| `'save-data': 'false'`        | Only if the browser doesn't ask to save data (or, set to `true`, only if it does) |

An island with several conditions waits for all of them, and `on: {}`
hydrates it right away.

Props are written into the page as JSON, so pass data, not functions. Children
are rendered on the server and kept as they are. [Interactive components](https://doc-kit.nodejs.org/customization#interactive-components)
in the guide has more on when islands hydrate.

## Theme config module

Components read build-time values from `#theme/config`, a module the generator
writes for each build. Import only what you need, and the rest is left out of
the bundle:

```js
import { project, repository, editURL } from '#theme/config';
```

| Export                   | Value                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                | The documented version as a semver object: `version.version` is `'22.11.0'`, `version.major` is `22`.                                         |
| `versions`               | The version selector's entries, `{ url, label, major }`, with `{path}` left in `url`.                                                         |
| `editURL`                | `editURL` with everything but `{path}` filled in, or `undefined`.                                                                             |
| `pages`                  | `[name, path]` pairs for every module page, in the default sidebar's order.                                                                   |
| `documentationIndex`     | What `<DocumentationIndex />` lists: `{ api, name, index, description }` for every module page but `index`. `index` is the stability, if any. |
| `chunks`                 | Each split module's section pages, by the module's path: `{ label, items }`, nested by heading depth. Empty without section pages.            |
| `languageDisplayNameMap` | A `Map` from arrays of a language's names and aliases to its display name, for code block labels.                                             |
| `server`                 | `true` in the server build, `false` in the browser.                                                                                           |

Every other option of the `html` section is exported under its own name too,
including the global options it inherits, such as `project`, `repository`,
`baseURL`, `useAbsoluteURLs`, `navigation`, `showSearchBox` and
`remoteConfigUrl`. The exceptions are `changelog`, `index`, `imports`,
`virtualImports`, `stylesheets`, `components`, `head` and `bundler`.
`repository`, `baseURL` and `remoteConfigUrl` are `undefined` when unset.

For values of your own, `virtualImports` adds modules next to it. Each key is a
module ID, and each value the module's source:

```js displayName="doc-kit.config.mjs"
export default {
  html: {
    virtualImports: {
      '#theme/site': `export const chat = 'https://chat.example.com';`,
    },
  },
};
```

A component then imports it like any other module:
`import { chat } from '#theme/site'`.

## Client-side navigation

The site moves between its own pages client-side, through the
[Navigation API](https://developer.mozilla.org/docs/Web/API/Navigation_API):
following a link fetches the next page, prefetched when the link is hovered or
pressed, and swaps it into the current document. Scripts, stylesheets, fonts,
the search index and the remote configuration stay loaded, and back and
forward, scrolling and focus behave as they do for full loads. Links outside
the site, files that aren't pages, pages that load other scripts or
stylesheets (such as a newer deployment's), and browsers without the
Navigation API get regular navigations.

When you customize the site, keep in mind that:

- The whole `<body>` is replaced, and scripts in it don't run. Of the
  `<head>`, only the `<title>` and the page-specific tags follow the page:
  `<meta>` tags, and `<link>` tags other than stylesheets and preloads (such as
  `canonical`).
- Islands are unmounted and hydrated again on every page. Anything shared
  across pages belongs in module scope, which lasts for the whole visit. An
  island that scrolls keeps its position when the next page renders it too.
- Once the document has navigated client-side, `<html>` has a `data-navigated`
  attribute, for styles that only belong on the first page, such as entry
  animations.
- Analytics can count client-side page views through the Navigation API's
  `navigatesuccess` event.

## Bundler adapters

The `bundler` option takes a small adapter, so the site can be built with Vite
(the default) or any other bundler.

> [!WARNING]
> Worker threads receive a copy of the configuration, and functions can't be
> copied. A configuration that sets `bundler`, the Vite adapter included, must
> build with `threads: 1` (or `--threads 1`). With more threads, the build
> fails with a `DataCloneError`.

### Writing an adapter

An adapter is an object with three methods. The generator calls `buildServer`
and `buildClient` once each and `compile` once per page, then renders the pages
from the compiled modules across the worker threads.

- `buildServer(options)` {Function} Bundles the component library for Node.js
  and returns a promise of the `file:` URL of the built module.
  - `entry` {string} The library's source: re-exports of every component a
    page may render, Preact's `h` and `Fragment`, and `renderToStringAsync`.
  - `virtualImports` {Object} In-memory modules to make available, by module
    ID, `#theme/config` included.
  - `outDir` {string} A temporary directory to write the library to, which the
    generator removes afterwards.
  - `config` {Object} The resolved `html` configuration.
- `compile(code, fileName)` {Function} Turns one page module, written in JSX,
  into plain JavaScript Node.js can import, and returns a promise of it.
  Compile JSX with the classic runtime, to calls of the `_jsx` and `_Fragment`
  bindings the module imports from the library, so the page and the library
  share one Preact.
- `buildClient(options)` {Function} Bundles the client entry into
  `config.output` and returns a promise of the assets every page loads:
  `{ scripts, preloads, stylesheets, fonts }`, as paths relative to the output
  directory. `preloads` are the chunks the scripts import statically, rendered
  as `modulepreload` hints, and `fonts` (optional) are fonts to preload.
  - `entry` {string} The client program every page shares.
  - `virtualImports` {Object} In-memory modules to make available, by module
    ID, `#theme/config` included.
  - `config` {Object} The resolved `html` configuration.

Both builds must compile the components' JSX for Preact, handle CSS imports and
CSS modules, resolve the `config.imports` aliases, and serve the
`virtualImports`. In the server build, `#theme/config` exports `server` as
`true`; in the client build, `false`. Also:

- Bundle the server library into one self-contained module, with no external
  dependencies: the page modules import it from a temporary directory.
- Put the client's CSS in stylesheets that every page loads up front, rather
  than splitting it per chunk. Islands hydrate after the page is on screen, so
  CSS that arrives with their chunks would style it late.
- Name client files after a hash of their content, so hosts can cache them
  indefinitely.

An adapter can live in your project, without changes to doc-kit. Pass it as
`bundler`, with `threads: 1`:

```js displayName="webpack-bundler.mjs"
export const createWebpackBundler = webpackOptions => ({
  async buildServer({ entry, virtualImports, outDir, config }) {
    // Run webpack's Node.js target on `entry`, serving `virtualImports` and
    // the `config.imports` aliases, write one self-contained module under
    // `outDir`, and return its `file:` URL.
  },

  async compile(code, fileName) {
    // Transform the JSX (classic runtime, pragma `_jsx`, fragment pragma
    // `_Fragment`) and return the module's source.
  },

  async buildClient({ entry, virtualImports, config }) {
    // Run webpack's browser target into `config.output` and return
    // { scripts, preloads, stylesheets } as output-relative paths.
  },
});
```

### Vite adapter

Without a `bundler`, the generator builds with Vite. To configure Vite, create
the adapter yourself with `createViteBundler`, passing it a Vite configuration:

```js displayName="doc-kit.config.mjs"
import { createViteBundler } from '@doc-kit/generator-react/html/bundlers/vite';

import myVitePlugin from './my-vite-plugin.mjs';

export default {
  threads: 1,

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

Your configuration is merged in first, then the generator sets what
coordinates its builds:

- **Replaced:** `configFile`, `base`, `appType`, `publicDir`, the build's
  inputs, output directory, output format and asset file names, `build.write`,
  `build.emptyOutDir`, `build.copyPublicDir`, `build.watch`, `build.lib`, CSS
  code splitting (off in the client build), the server-side rendering
  settings, the JSX settings (Preact's automatic runtime), and
  `css.transformer`, which is always Lightning CSS (its own options, under
  `css.lightningcss`, are yours). The server build, which never ships, also
  has `build.manifest` and `build.minify` off.
- **Merged:** `resolve`, with the aliases and conditions the generator adds.
  Your `plugins` run after the generator's virtual-module plugin, so they can
  transform every module of both builds.
- **Yours, with these defaults:**
  - `root` {string} The directory relative `imports` paths resolve against.
    **Default:** the working directory.
  - `logLevel` {string} **Default:** `'warn'`.
  - `clearScreen` {boolean} **Default:** `false`.
  - `build.minify` {boolean|string} Minifies the client assets. The `minify`
    option only covers the pages' HTML. **Default:** `true`.
  - `build.manifest` {boolean|string} Keeps Vite's manifest in the output, at
    `.vite/manifest.json` or the path given. The adapter writes one either way
    to find the assets' names, and removes it unless you asked for it.
    **Default:** `false`.

Vite builds the client from a module entry, not from the HTML pages, so
plugins never see the pages and `transformIndexHtml` hooks don't run. Change
the pages through the [HTML template](#html-template) instead.
