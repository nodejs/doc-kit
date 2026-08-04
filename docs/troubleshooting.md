# Troubleshooting

The failure modes people actually hit, with the shortest way out of each.

## The site is blank or unstyled when opened from disk

The `html` output uses import maps and client-side hydration, so it must be
served over HTTP — `file://` won't work. Preview any build with:

```bash
npx doc-kit serve --static -o out
```

## "Both a `target` and an `input` must be provided"

`generate` and `serve` need at least a generator target and input files,
from flags or a configuration file. If you have a config file and still see
this, it wasn't found: configuration is discovered from the directory you
run the CLI in. Run from the project root, or point at the file explicitly
with `--config-file path/to/doc-kit.config.mjs`.

## Search finds nothing

The search box queries an index built by the `orama-db` generator. Generate
it alongside the site — `target: ['html', 'orama-db']` — and make sure
you're serving over HTTP, not `file://`.

## The build fetches from nodejs.org (or fails offline)

Two defaults reach for the network: `changelog` and `index` point at the
Node.js repository unless you say otherwise. A project without a release
history can short-circuit both with empty values:

```js
global: {
  changelog: [],
  index: [],
},
```

Or point them at your own files — see the
[configuration reference](./configuration.md).

## `bootstrap` or `install` couldn't install packages

Package installation runs through your package manager, so registry issues
surface here. Your project is still fully set up — install the generator
packages whenever you're ready with `npx doc-kit install`, or directly:

```bash
npm install --save-dev @nodejs/doc-kit-generator-react
```

## Port 3000 is taken

`doc-kit serve` automatically walks to the next free port and prints the URL
it chose. Prefer a specific one with `--port 8080`.

## Warnings about type annotations

A `{braces}` span that isn't a valid TypeScript type expression logs a
warning with its source location and renders as plain, unlinked code. Fix
the expression, or — if the braces were meant literally — escape them or
wrap them in a code span.

## No version selector on the site

The selector is built from your `changelog` release history. Without one
there is nothing to switch between, so the control is omitted. See
[versioned docs](./publishing.md) to set it up.

## Still stuck?

Open an issue in the [issue tracker](https://github.com/nodejs/doc-kit/issues)
or ask in the
[#nodejs-website channel](https://openjs-foundation.slack.com/archives/CVAMEJ4UV)
on the OpenJS Slack.
