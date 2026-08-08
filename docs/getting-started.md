# Getting started

First, install doc-kit and a generator, like so:

```bash
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
```

Then, create your configuration file set up for your project:

```mjs displayName="doc-kit.config.mjs"
/** @type {import('@doc-kit/core/utils/configuration/types').Configuration} */
export default {
  target: ['html'],

  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
};
```

`doc-kit generate` reads that configuration; every option can also be passed as
a CLI flag. See the [configuration reference](./configuration.md) for
everything the file accepts.

## Build and preview it

With at least one Markdown file under `docs/`, build the site:

```bash
npx @doc-kit/cli generate
```

The pages land in `out/`. They use import maps and client-side hydration, so
serve them over HTTP rather than opening the files from disk; any static server
works:

```bash
npx @doc-kit/cli generate -t html -t orama-db -i "docs/*.md" -o out
```

## Preview it locally

The `html` output uses import maps and client-side hydration, so it must be
served over HTTP — opening the files directly with `file://` will not work. Any
static server will do the trick; for example:

```bash
npx serve out -p 3000
```

Then open the printed URL (usually <http://localhost:3000>). The
`legacy-html-all` output from earlier has no such requirement — `out/all.html`
opens straight from disk.

## Customize the `html` generator output

The power of the `html` generator comes from its customization hooks. Let's walk
through a couple quick changes.

Create a `doc-kit.config.mjs` file at the root of the project.

```mjs displayName="doc-kit.config.mjs"
import { join } from 'node:path';

/** @type {import('@doc-kit/core/src/utils/configuration/types').Configuration} */
export default {
  global: {
    project: 'My Project', // Project name used in titles, the logo, and templates
  },

  html: {
    head: {
      html: [
        // re-write the brand color for effect
        `<style>
          :root {
            --color-brand-100: #f7f1fb;
            --color-brand-200: #ead9fb;
            --color-brand-300: #dbbdf9;
            --color-brand-400: #c79bf2;
            --color-brand-600: #9756d6;
            --color-brand-700: #7d3cbe;
            --color-brand-800: #642b9e;
            --color-brand-900: #361b52;
          }
        </style>`,
      ],
    },
    // use a custom logo component instead of the plain project name
    // our logo.jsx file like this, just for the demo
    // export default Logo = () =>
    //   <svg height="30" width="30" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="var(--color-brand-400)"/></svg>;
    imports: {
      '#theme/Logo': join(import.meta.dirname, './logo.jsx'),
      // You can also change things such as `#theme/Layout`,
      // and more!
    },
  },
};
```

Open the printed URL (usually <http://localhost:3000>) and your documentation is
on screen.

## Next steps

- [Writing documentation](./writing-docs.md) — the Markdown conventions that
  make `doc-kit` more than a static-site generator.
- [Customizing the site](./customization.md) — your name, logo, navigation,
  and components instead of the defaults.
- [Publishing your docs](./publishing.md) — production builds, base URLs, and
  hosting.
