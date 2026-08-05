# Customizing the site

This page walks the customizations most projects make, in the
order they usually make them. The complete option list lives in the
[`html` generator reference](./generators/html.md).

All of it goes in the `html` section of your configuration file:

```js
// doc-kit.config.mjs
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

## Name and titles

```js
html: {
  project: 'My Project', // Used in page titles and the version selector
  title: '{project} Documentation', // Browser-tab title template
  // Suppress the Node.js announcement banner fetched at runtime
  remoteConfigUrl: '',
},
```

`title` supports `{project}` and `{version}` placeholders.

## The `<head>`

`head` controls the markup injected into every page's `<head>`:

```js
html: {
  head: {
    meta: [
      { name: 'description', content: 'My project documentation' },
      { property: 'og:image', content: 'https://example.com/og.png' },
    ],
    links: [{ rel: 'icon', href: '/favicon.ico' }],
    html: [
      `<style>
        :root, :root.dark {
          --color-brand-400: #b8adff;
          --color-brand-600: #6e5cd9;
        }
      </style>`,
    ],
  },
},
```

The `<style>` override above re-brands the accent color: the UI derives its
palette from `--color-brand-*` custom properties, so a few lines of CSS
restyle the whole site.

## Navigation

Without configuration, the sidebar is one group holding every page. The
`navigation` key allows you to customize it:

```js
html: {
  navigation: {
    sidebar: [
      {
        groupName: 'Guides',
        items: [{ label: 'Getting started', link: '/getting-started' }],
      },
      {
        groupName: 'Reference',
        items: [{ label: '`api`', link: '/api' }],
      },
    ],
    navbar: [
      { text: 'GitHub', link: 'https://github.com/me/project', target: '_blank' },
    ],
  },
},
```

Sidebar `link`s are page paths without extensions; backticked spans in a
`label` render as code. Items can nest through their own `items` array. The
sidebar also shows a version selector when your configuration provides a
[`changelog`](./configuration.md).

## Logo and theme components

The page chrome is built from swappable components. Override any `#theme/*`
alias with a path to your own:

```js
html: {
  imports: {
    '#theme/Logo': './src/MyLogo.jsx',
    '#theme/Footer': './src/MyFooter.jsx',
  },
},
```

```jsx displayName="src/MyLogo.jsx"
export default () => (
  <svg height="30" width="30" viewBox="0 0 10 10">
    <circle cx="5" cy="5" r="5" fill="var(--color-brand-400)" />
  </svg>
);
```

Available slots: `#theme/Logo`, `#theme/Navigation`, `#theme/Sidebar`,
`#theme/Metabar`, `#theme/Footer` (renders nothing by default), and
`#theme/Layout` (the outermost wrapper). Custom components can import
whatever build-time data they need — project name, version list, page index
— from the `#theme/config` virtual module; see the
[`html` reference](./generators/html.md) for its exports.

## Custom components and MDX

Register your own JSX components and use them directly in content:

```js
html: {
  components: {
    Hero: '#theme/Hero',
  },
  imports: {
    '#theme/Hero': './src/components/Hero.jsx',
  },
},
```

```md
---
title: Welcome
---

# Welcome

<Hero title="My Project" />
```

Author component-bearing pages as `.mdx` files (or set `mdx: true` in a
page's frontmatter). Regular `.md` files treat `<` and `{` literally, which
is what API documentation wants; MDX pages get real JSX and skip API-doc
signature parsing while keeping headings, TOC, and sidebar behavior.

## The bundler

Vite builds the site by default, and accepts your plugins and options:

```js
import { createViteBundler } from '@nodejs/doc-kit-generator-react/html/bundlers/vite';

export default {
  html: {
    bundler: createViteBundler({
      plugins: [myVitePlugin()],
    }),
  },
};
```

A different bundler entirely (webpack, Rspack, …) can be supplied as a small
adapter object — see [Bundler adapters](./generators/html.md) in the
reference.
