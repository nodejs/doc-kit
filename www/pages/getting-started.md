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

`doc-kit generate` readsthat configuration; every option can also be passed as a
CLI flag. See the [configuration reference](./configuration.html) for everything
the file accepts.

## Next steps

- [Writing documentation](./writing-docs.html) — the Markdown conventions that
  make `doc-kit` more than a static-site generator.
- [Customizing the site](./customization.html) — your name, logo, navigation,
  and components instead of the defaults.
- [Publishing your docs](./publishing.html) — production builds, base URLs, and
  hosting.
