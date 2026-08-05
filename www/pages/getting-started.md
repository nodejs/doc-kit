# Getting started

First, install doc-kit and a generator, like so:

```bash
npm install --save-dev @nodejs/doc-kit @nodejs/doc-kit-generator-react
```

Then, create your configuration file set up for your project:

```js displayName="doc-kit.config.mjs"
/** @type {import('@nodejs/doc-kit/utils/configuration/types').Configuration} */
export default {
  target: ['html'],

  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
};
```

`doc-kit generate` reads that configuration; every option can also be passed as
a CLI flag. See the [configuration reference](./configuration.html) for
everything the file accepts.

## Build and preview it

With at least one Markdown file under `docs/`, build the site:

```bash
npx doc-kit generate
```

The pages land in `out/`. They use import maps and client-side hydration, so
serve them over HTTP rather than opening the files from disk; any static server
works:

```bash
npx serve out
```

Open the printed URL (usually <http://localhost:3000>) and your documentation is
on screen.

## Next steps

- [Writing documentation](./writing-docs.html) — the Markdown conventions that
  make `doc-kit` more than a static-site generator.
- [Customizing the site](./customization.html) — your name, logo, navigation,
  and components instead of the defaults.
- [Publishing your docs](./publishing.html) — production builds, base URLs, and
  hosting.
