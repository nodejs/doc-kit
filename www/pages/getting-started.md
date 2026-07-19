# Getting started

This page takes you from an empty directory to a rendered documentation page.

## Install

From an initialized npm project, run this in your terminal.

```bash
npm install --save-dev @node-core/doc-kit
```

## Write a valid input document

Create `docs/hello.md`:

```markdown
# hello

A one-line description of the module.

## `hello.greet(name)`

- `name` {string} The name to greet.
- Returns: {string}

Greets `name`.
```

> If you omit the `#` heading, `doc-kit` emits no page for the file and still
> exits successfully. An empty output directory almost always means a missing
> level-one heading.

## Render it

The `legacy-html-all` target has no additional dependencies and is the quickest
way to see output:

```bash
npx doc-kit generate \
  -t legacy-html-all \
  -i "docs/*.md" \
  -o out
```

Open `out/all.html` in a browser. You'll notice the Node.js branding, however,
that's fully customizable via [a configuration file][].

## Render the modern site

The `web` target produces the server-rendered, client-hydrated site that
[nodejs.org](https://nodejs.org) uses — and that this site is built with:

```bash
npx doc-kit generate \
  -t web \
  -i "docs/*.md" \
  -o out
```

Pair it with `orama-db` to add search:

```bash
npx doc-kit generate -t web -t orama-db -i "docs/*.md" -o out
```

## Preview it locally

The `web` output uses import maps and client-side hydration, so it must be
served over HTTP — opening the files directly with `file://` will not work. Any
static server will do the trick; for example:

```bash
npx serve out -p 3000
```

Then open the printed URL (usually <http://localhost:3000>). The
`legacy-html-all` output from earlier has no such requirement — `out/all.html`
opens straight from disk.

## Customize the `web` generator output

The power of the `web` generator comes from its customization hooks. Let's walk
through a couple quick changes.

Create a `doc-kit.config.mjs` file at the root of the project.

```mjs
import { join } from 'node:path';

/** @type {import('@node-core/doc-kit/src/utils/configuration/types').Configuration} */
export default {
  web: {
    project: 'My Project', // Project name used in page titles and the version selector
    remoteConfigUrl: '', // Suppress the Node.js default that sets the top banner based on Node.js news.
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
    // use a custom logo instead of the Node.js logo
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

Re-build the project, serve, and you'll see how quickly you can change the
experience, preserving core functionality.

## Next steps

- Explore [Configuration](./configuration) — consider moving your `-t` target
  flags into a `doc-kit.config.mjs` file.
- [Further customize the `web` generator](./generators/web) — give it a custom
  sidenav or footer.
- [Read the full input specification](./specification) — the full Markdown
  contract.
