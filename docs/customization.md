# Customizing the site

The site the `html` generator builds starts out neutral: your project's name
in place of a logo, a grey accent color, and a sidebar listing every page. This
guide makes it yours, from colors and a logo to components of your own and whole
new page layouts, starting from the site you built in
[Getting started](./getting-started.md).

Most of this goes in the `html` section of your configuration file:

```mjs displayName="doc-kit.config.mjs"
export default {
  target: ['html'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
  html: {
    // ... everything on this page
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

The [Website reference](./generators/html.md#configuring) lists its default
and placeholders.

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

`head` adds tags to every page's `<head>`; see
[Head tags](./generators/html.md#head-tags). Files you link to have to be in
the output: [`pathsToCopy`](./configuration.md#global-options) copies them
there.

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
every page by its title, and the navigation bar has no links. `navigation`
replaces either; see [Navigation](./generators/html.md#navigation) for an
example and every field.

The navigation bar also holds the search box, the theme switch, and a link to
the GitHub repository when `global.repository` is set. The sidebar adds a
version selector when your configuration has a `changelog`, as
[Publishing several versions](./publishing.md#publishing-several-versions)
describes.

## Replacing parts of the page

Every part of the page around your content is a component, imported through a
`#theme/*` alias:

![The parts of the html generator's page, each an import alias you can swap](./diagrams/theme-slots.svg)

Point an alias at your own component in `imports`, and every page uses it. The
[theme slots](./generators/html.md#theme-slots) table lists each alias, its
default and the props it receives.

### The theme's data

Components read build-time data from the `#theme/config` module, and
`virtualImports` adds modules of your own; see
[Theme config module](./generators/html.md#theme-config-module).

## Custom components and MDX

Markdown pages have no components: their tags are plain HTML. To use
components in a page, write it in [MDX](./writing-docs.md#mdx-pages), register
your components in `components` (see
[Components in MDX](./generators/html.md#components-in-mdx)), and use them as
tags:

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

Some components come built in and need no registering, such as
`<DocumentationIndex />`.

## Interactive components

Components render to HTML when the site is built, and load no JavaScript. A
component that has to run in the browser, with state, effects or event
handlers, has to be an island: wrap it with `withIsland`, and list it in
`components` under the name you give it, even when only other components
render it. [Interactive components](./generators/html.md#interactive-components)
in the Website reference shows how.

An island missing from `components` stays static, and the browser console
reports `[is-land] no component registered for "Counter"`.

With `interaction: true`, the click that hydrates an island reaches it before
its component has loaded, so the component never handles that click. An island
that has to handle its first click hydrates on
`interaction: 'pointerover,focusin,touchstart'` instead, as doc-kit's code
blocks do: it starts loading as the pointer or focus arrives, and a click that
lands before it has loaded is replayed once it has.

The island's first render in the browser has to match the HTML built for it,
so read browser-only state, such as `localStorage`, in an effect.

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
options, or to build with another bundler, see
[Bundler adapters](./generators/html.md#bundler-adapters).

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
- Islands for the home page's two animations, and the sections the page is
  laid out with, all listed in `components`.
- A stylesheet that swaps the typeface for Inter and keeps doc-kit's neutral
  palette, and a template that preloads Inter instead of Open Sans.
- A `#theme/site` virtual module with doc-kit's version, for the footer.
- A rehype plugin that inlines the diagrams, and `pathsToCopy` for its public
  files, fonts and JSON schemas.

When your site looks right, [Publishing your docs](./publishing.md) covers
putting it online.
