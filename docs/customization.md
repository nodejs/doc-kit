# Customizing the site

The site the `html` generator builds starts out neutral: your project's name
in place of a logo, a grey accent color, and a sidebar listing every page. This
guide makes it yours, from colors and a logo to components of your own and whole
new page layouts, starting from the site you built in
[Getting started](./getting-started.md).

Most of this goes in the `html` section of your configuration file:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  target: ['html', 'orama-db'],

  global: {
    project: 'Kittens',
    version: '1.0.0',
    input: ['docs/**/*.{md,mdx}'],
    output: 'out',
  },

  html: {
    title: '{project} docs',
    stylesheets: [join(import.meta.dirname, 'theme/styles.css')],
    imports: {
      '#theme/Logo': join(import.meta.dirname, 'theme/Logo.jsx'),
    },
  },
};
```

Relative paths in the `html` section resolve against the directory you run
doc-kit from, so the examples build absolute ones from the configuration
file's location with `import.meta.dirname`. The
[Website reference](./generators/html.md) lists every option.

## Name and title

`project` names the site: the default logo shows it, and so does the version
selector. Set it under `global`, since other generators use it too, or under
`html` for the site alone. Without one, doc-kit uses the `name` in your
`package.json`.

`title` is the template for the second half of each page's `<title>`. The first
half is the page's own title, from its `title` frontmatter or its first
heading:

```js displayName="doc-kit.config.mjs"
export default {
  html: {
    // "Getting started | Kittens docs"
    title: '{project} docs',
  },
};
```

Any option of the `html` section, global ones included, works as a
placeholder, such as `{project}`, or `{version}` for the version number. The
default is `'{project} {version} Documentation'`, so set `global.version` or
drop `{version}`: without one, it shows the version of Node.js running
doc-kit. An empty `title` leaves each page its own title alone.

## Colors and fonts

Restyle the site with a stylesheet of your own. `stylesheets` lists CSS files
that are bundled after doc-kit's own, so their rules and custom properties
win, and that go through the bundler like any other CSS (`@import` and `url()`
work).

The UI takes its accent color, used for links, focus rings and active states,
from nine `--color-brand-*` custom properties. Redefine them all to rebrand the
site:

```css displayName="theme/styles.css"
:root {
  --color-brand-100: #f3f0ff;
  --color-brand-200: #e4dcff;
  --color-brand-300: #cbbcff;
  --color-brand-400: #ac94fa;
  --color-brand-500: #8e6cf0;
  --color-brand-600: #7350d9;
  --color-brand-700: #5c3db8;
  --color-brand-800: #482f91;
  --color-brand-900: #33216a;
}
```

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  html: {
    stylesheets: [join(import.meta.dirname, 'theme/styles.css')],
  },
};
```

One palette serves both color schemes: the UI picks lighter shades in dark
mode. For styles of your own that differ in dark mode, use the
`[data-theme='dark']` selector, which matches once the `<html>` element is in
dark mode.

The text uses the font in `--font-open-sans`, and code the one in
`--font-ibm-plex-mono`. They are named after doc-kit's default fonts, but hold
whatever font stack you give them:

```css displayName="theme/styles.css"
@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('./fonts/inter-latin-wght-normal.woff2') format('woff2');
}

:root {
  --font-open-sans: 'Inter Variable', system-ui, sans-serif;
}
```

Prefer a stylesheet to a `<style>` tag in [the `<head>`](#the-head): it is
bundled, minified and cached with the rest of the site's CSS.

> [!TIP]
> The default template preloads doc-kit's own fonts through `${preloads}`. If
> you replace them, [a template of your own](#the-page-template) can drop or
> filter `${preloads}`; this site's template keeps only the monospace one.

## Logo

The logo sits at the start of the navigation bar, inside a link to the home
page. By default it is the project's name as text. To replace it, point the
`#theme/Logo` alias at a component of your own:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  html: {
    imports: {
      '#theme/Logo': join(import.meta.dirname, 'theme/Logo.jsx'),
    },
  },
};
```

```jsx displayName="theme/Logo.jsx"
import { project } from '#theme/config';

export default () => (
  <span class="logo">
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="var(--color-brand-600)" />
    </svg>
    {project}
  </span>
);
```

The logo is one of the [parts of the page](#replacing-parts-of-the-page) you
can replace, and `#theme/config` holds the
[build-time data](#the-themes-data) components can read.

> [!NOTE]
> Theme components are [Preact](https://preactjs.com/) components, so
> `preact` has to resolve from your project, for their JSX and any hooks they
> import. npm usually hoists it from `@doc-kit/generator-react`; with pnpm,
> install it yourself.

## The `<head>`

`head` adds tags to every page's `<head>`:

```js displayName="doc-kit.config.mjs"
export default {
  html: {
    head: {
      meta: [
        { name: 'description', content: 'Kittens: an API for cats.' },
        { property: 'og:image', content: 'https://kittens.example/og.png' },
      ],
      links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      html: ['<script defer src="https://stats.example/script.js"></script>'],
    },

    // Copies what is in `public/` to the root of the output
    pathsToCopy: [{ public: '.' }],
  },
};
```

`meta` and `links` take one object of attributes per tag, and `html` takes raw
markup, added as written. The tags are the same on every page, so link files
by absolute path or full URL.

Files you link to have to be in the output. `pathsToCopy` copies them there:
by default the `assets`, `public` and `static` directories of the working
directory, under the same names. An object maps a source to a destination
inside the output instead, as `{ public: '.' }` does above to put
`favicon.svg` at the root. Setting `pathsToCopy` replaces the default list.

## The page template

Every page is written from an HTML template. It places the `head` tags and also
writes the `<title>`, the `og:title` and `og:type` tags, and the tags loading
the site's scripts and styles. For anything else, copy the default template
(`src/html/template.html` in `@doc-kit/generator-react`) and point
`templatePath` at your copy. Keep `${assets}` in its `<head>`, or the pages
load no scripts or styles. The
[Website reference](./generators/html.md#html-template) lists the template's
variables.

## Navigation

Without configuration, the sidebar has one group, `API Documentation`, listing
every page by its title (alphabetically, with `index` first), and the
navigation bar has no links. `navigation` replaces either:

```js displayName="doc-kit.config.mjs"
export default {
  html: {
    navigation: {
      sidebar: [
        {
          groupName: 'Guides',
          items: [
            { label: 'Getting started', link: '/getting-started' },
            {
              label: 'Recipes',
              link: '/recipes',
              items: [
                { label: 'Overview', link: '/recipes' },
                { label: 'Feeding', link: '/recipes/feeding' },
              ],
            },
          ],
        },
        {
          groupName: 'Reference',
          items: [{ label: 'The `Kitten` class', link: '/kitten' }],
        },
      ],
      navbar: [
        { text: 'Guide', link: '/getting-started' },
        {
          text: 'GitHub',
          link: 'https://github.com/example/kittens',
          target: '_blank',
        },
      ],
      showCrossLinks: true,
    },
  },
};
```

A sidebar `link` is a page's path without its extension, such as
`/getting-started`, and works wherever the site is served from. An item with
nested `items` opens and closes rather than linking anywhere, so list its own
page as its first nested item, as `Recipes` does. `showCrossLinks` ends each
page with links to the previous and next top-level items of your `sidebar`.
The [Website reference](./generators/html.md#navigation) lists every field.

The navigation bar also holds the search box, the theme switch, and a link to
the GitHub repository when `global.repository` is set. The search box appears
when you build the [search index](./generators/orama-db.md) too; set
`showSearchBox` to `true` or `false` to decide yourself. The sidebar adds a
version selector when your configuration has a `changelog`, as
[Publishing several versions](./publishing.md#publishing-several-versions)
describes.

## Replacing parts of the page

Every part of the page around your content is a component, imported through a
`#theme/*` alias:

![The parts of the html generator's page, each an import alias you can swap](./diagrams/theme-slots.svg)

| Alias               | What it renders                                 | Default                                              |
| ------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `#theme/Layout`     | The whole page, around the content              | The parts below, around the content                  |
| `#theme/Logo`       | The logo, inside the navigation bar's home link | The project's name                                   |
| `#theme/Navigation` | The navigation bar                              | Links, search box, theme switch, GitHub link         |
| `#theme/Sidebar`    | The sidebar                                     | Page links and the version selector                  |
| `#theme/Metabar`    | The column beside the content                   | Table of contents, reading time, view and edit links |
| `#theme/Footer`     | The bottom of every page                        | Nothing                                              |

Point an alias at your own component in `imports`, and every page uses it. The
aliases you leave out keep their defaults:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  html: {
    imports: {
      '#theme/Footer': join(import.meta.dirname, 'theme/Footer.jsx'),
    },
  },
};
```

```jsx displayName="theme/Footer.jsx"
import { project, repository } from '#theme/config';

export default () => (
  <footer class="footer">
    {project} is released under the{' '}
    <a href={`https://github.com/${repository}/blob/main/LICENSE`}>
      MIT License
    </a>
    .
  </footer>
);
```

Your component receives the props of the one it replaces: the navigation bar,
the sidebar and the metabar get the page's `metadata`, and the metabar also
gets `headings` and `readingTime`. The logo and the footer get none.

To build on a default rather than start over, import it from
`@doc-kit/generator-react/html/ui/components/`: `NavBar.jsx`,
`SideBar/index.jsx`, `MetaBar/index.jsx` or `Layout/index.jsx`. Import the
other parts through their aliases, so your overrides still apply.

### The theme's data

Components read build-time data from the `#theme/config` module. Import only
what you need:

```jsx displayName="theme/Footer.jsx"
import { project, version } from '#theme/config';

export default () => (
  <footer class="footer">
    {project} v{version.version}
  </footer>
);
```

`version` is the version being built, and `version.version` its number. The
module also exports `repository`, `baseURL`, the list of `pages`, and most
other `html` options; the
[Website reference](./generators/html.md#theme-config-module) lists them all.

For data of your own, add modules with `virtualImports`. Each key is an import
specifier, and each value the module's source code:

```js displayName="doc-kit.config.mjs"
export default {
  html: {
    virtualImports: {
      '#theme/links': 'export const chat = "https://chat.example/kittens";',
    },
  },
};
```

```jsx displayName="theme/Footer.jsx"
import { chat } from '#theme/links';

export default () => (
  <footer class="footer">
    Questions? <a href={chat}>Ask in the chat</a>.
  </footer>
);
```

## Custom components and MDX

Markdown pages have no components: their tags are plain HTML. To use
components in a page, write it in [MDX](./writing-docs.md#mdx-pages), register
your components in `components`, and use them as tags:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  html: {
    components: {
      Hero: '#theme/Hero',
    },
    imports: {
      '#theme/Hero': join(import.meta.dirname, 'theme/Hero.jsx'),
    },
  },
};
```

```jsx displayName="theme/Hero.jsx"
export default ({ title, children }) => (
  <section class="hero">
    <p class="hero__title">{title}</p>
    {children}
  </section>
);
```

```mdx displayName="docs/index.mdx"
---
title: Kittens
---

# Kittens

<Hero title="An API for cats">
  Feed, pet and schedule naps, from one small library.
</Hero>
```

Each key in `components` is a tag, and its value the module whose default
export is the component, usually a `#theme/*` alias you define in `imports`.
For a named export, see
[Components in MDX](./generators/html.md#components-in-mdx). Each page imports
only the components it uses, and some come built in and need no registering,
such as `<DocumentationIndex />`.

## Interactive components

Components render to HTML when the site is built, and load no JavaScript. A
component that has to run in the browser, with state, effects or event
handlers, has to be an island: doc-kit renders it at build time, then loads it
in the browser and hydrates it once a condition you choose is met.

Wrap the component with `withIsland`, giving it a name and its conditions:

```jsx displayName="theme/Counter.jsx"
import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';
import { useState } from 'preact/hooks';

const Counter = ({ start = 0 }) => {
  const [count, setCount] = useState(start);

  return (
    <button type="button" onClick={() => setCount(count + 1)}>
      Petted {count} times
    </button>
  );
};

export default withIsland(Counter, { name: 'Counter', on: { idle: true } });
```

Then list it in `components` under that same name, so the browser knows which
module to load for it. Do this even for an island that only other components
render, never a page:

```js displayName="doc-kit.config.mjs"
import { join } from 'node:path';

export default {
  html: {
    components: {
      Counter: '#theme/Counter',
    },
    imports: {
      '#theme/Counter': join(import.meta.dirname, 'theme/Counter.jsx'),
    },
  },
};
```

```mdx displayName="docs/kitten.mdx"
<Counter start={3} />
```

An island missing from `components` stays static, and the browser console
reports `[is-land] no component registered for "Counter"`.

`on` takes [is-land](https://is-land.11ty.dev/)'s loading conditions, without
their `on:` prefix, such as `{ idle: true }` or `{ visible: true }`. `idle`
suits most islands, and it's what this site's own islands use. The
[Website reference](./generators/html.md#interactive-components) lists every
condition.

With `interaction: true`, the click that hydrates an island reaches it before
its component has loaded, so the component never handles that click. An island
that has to handle its first click hydrates on
`interaction: 'pointerover,focusin,touchstart'` instead, as doc-kit's code
blocks do: it starts loading as the pointer or focus arrives, and a click that
lands before it has loaded is replayed once it has.

Keep in mind that:

- Props are written into the page as JSON, so pass data only: strings,
  numbers, booleans, arrays and plain objects, not functions.
- Children are rendered at build time and kept as they are: the island
  receives them as static HTML, which doesn't become interactive.
- The island's first render in the browser has to match the HTML built for it.
  Read browser-only state, such as `localStorage`, in an effect.
- In browsers with the Navigation API, the site moves between its pages
  without reloading, and islands are unmounted and hydrated again on every
  page. Keep state that should outlast a page in module scope.

## Page layouts

`#theme/Layout` renders every page, so a layout of your own can give some
pages a different shape. This site's home page, for example, sets
`layout: home` in its frontmatter, and the site's layout renders it full width,
between the navigation bar and the footer, while every other page gets
doc-kit's documentation layout:

```jsx displayName="theme/Layout.jsx"
import DocLayout from '@doc-kit/generator-react/html/ui/components/Layout/index.jsx';

import Footer from '#theme/Footer';
import NavBar from '#theme/Navigation';

const HomeLayout = ({ metadata, children }) => (
  <>
    <NavBar metadata={metadata} />
    <div class="home" role="main">
      {children}
    </div>
    <Footer />
  </>
);

const LAYOUTS = { home: HomeLayout };

export default props => {
  const Layout = LAYOUTS[props.metadata.layout] ?? DocLayout;

  return <Layout {...props} />;
};
```

```mdx displayName="docs/index.mdx"
---
title: Kittens
layout: home
---

<Hero title="An API for cats" />
```

Point `#theme/Layout` at it in `imports`. A layout receives the page's
`metadata`, every field of its frontmatter included, its `headings`, its
`readingTime` and its content as `children`; the
[Website reference](./generators/html.md#layout-props) describes each.

doc-kit also builds a `404.html` page, whose `metadata.api` is `'404'`: check
for it to give that page a layout of its own.

> [!TIP]
> doc-kit's stylesheet styles the headings inside `<main>` as API entries. A
> layout for other kinds of pages can use another element with
> `role="main"`, as above.

## Markdown plugins

The pages' Markdown is rendered by the `jsx-ast` generator, which takes your
own [unified](https://unifiedjs.com/) plugins: remark plugins for the Markdown,
rehype plugins for the HTML, and recma plugins for the JavaScript it compiles
to. This site uses a rehype plugin to inline its diagrams as SVG, so they
follow the color scheme. See
[Markdown plugins](./configuration.md#markdown-plugins).

## The bundler

[Vite](https://vite.dev/) builds the site by default. To pass it plugins or
options, create its adapter yourself, with the Vite configuration to merge in:

```js displayName="doc-kit.config.mjs"
import { createViteBundler } from '@doc-kit/generator-react/html/bundlers/vite';

import myVitePlugin from './my-vite-plugin.mjs';

export default {
  // A bundler adapter needs a single thread, see below
  threads: 1,

  html: {
    bundler: createViteBundler({
      plugins: [myVitePlugin()],
      define: {
        'import.meta.env.STATS_ID': JSON.stringify('kittens'),
      },
    }),
  },
};
```

> [!WARNING]
> Worker threads can't receive functions, so a configuration that sets
> `bundler`, the Vite adapter included, has to build with `threads: 1` (or
> `--threads 1`). With more threads, the build fails with a `DataCloneError`.

Your plugins run after doc-kit's own and see every module of both builds, but
not the HTML pages: change those through the [template](#the-page-template).
The scripts and styles are minified unless you set `build.minify: false`; the
`minify` option only covers the HTML. A few options, such as the base URL and
the JSX runtime, are doc-kit's to set; the
[Vite adapter](./generators/html.md#vite-adapter) reference lists them.

Another bundler, such as webpack or Rspack, plugs in through a small adapter
of your own, which needs `threads: 1` as well. The
[Website reference](./generators/html.md#bundler-adapters) describes how to
write one.

## A complete example

This site is built with doc-kit, from the
[`www/`](https://github.com/nodejs/doc-kit/tree/main/www) directory of its
repository, and its
[configuration file](https://github.com/nodejs/doc-kit/blob/main/www/doc-kit.config.mjs)
uses most of this page:

- A [layout](https://github.com/nodejs/doc-kit/blob/main/www/theme/Layout.jsx)
  with a `home` layout for the
  [home page](https://github.com/nodejs/doc-kit/blob/main/www/pages/index.mdx),
  a 404 page, and doc-kit's layout for everything else.
- A logo and a footer of its own.
- Islands for the home page's animations and tabs, listed in `components`.
- A stylesheet that swaps the typeface for Inter and keeps doc-kit's neutral
  palette, and a template that preloads Inter instead of Open Sans.
- A `#theme/site` virtual module with doc-kit's version, for the footer, and
  the JSON schema's, for the home page.
- A rehype plugin that inlines the diagrams, and `pathsToCopy` for its public
  files, fonts and JSON schemas.

When your site looks right, [Publishing your docs](./publishing.md) covers
putting it online.
