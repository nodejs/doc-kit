# Getting started

This page takes you from an initialized npm project to a live-previewed
documentation site in two commands, then shows you where to go next.

**Prerequisites:** Node.js 22 or newer, and a project with a `package.json` (run
`npm init -y` if you're starting fresh).

## 1. Bootstrap

```bash
npx doc-kit bootstrap
```

`bootstrap` asks which generators you want (press Enter to accept `html`, the
modern documentation site) and where your docs live, then sets everything up:

```text
INFO (bootstrap): Created docs/hello.md (a starter page)
INFO (bootstrap): Created doc-kit.config.mjs (wired to your package.json)
INFO (bootstrap): Added out/ to .gitignore
```

It detects an existing `docs/` directory (or creates one with a starter page),
writes a `doc-kit.config.mjs` whose name and version are imported straight from
your `package.json`, and installs the generator packages. Pass `--yes` to accept
every default without prompting.

## 2. Serve

```bash
npx doc-kit serve
```

Open the printed URL (usually <http://localhost:3000>). You're looking at your
documentation site — server-rendered pages, sidebar, dark mode, and search
included.

## 3. Edit

Open `docs/hello.md`, change something, and save. `doc-kit` regenerates the
site; refresh the browser to see it. The starter page is a complete example of
the format: a title heading, a method entry, and a typed parameter list.

When you want a production build instead of a preview:

```bash
npx doc-kit generate
```

The site is written to `out/`, ready for any static host.

## Manual setup

Prefer to wire things yourself, or adding `doc-kit` to an existing project?
`bootstrap` is only a convenience — the pieces are two packages and one file:

```bash
npm install --save-dev @nodejs/doc-kit @nodejs/doc-kit-generator-react
```

```js
// doc-kit.config.mjs
/** @type {import('@nodejs/doc-kit/utils/configuration/types').Configuration} */
export default {
  target: ['html'],

  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
};
```

`doc-kit serve` and `doc-kit generate` read that configuration; every option can
also be passed as a CLI flag. See the
[configuration reference](./configuration.html) for everything the file accepts.

## Next steps

- [Writing documentation](./writing-docs.html) — the Markdown conventions that
  make `doc-kit` more than a static-site generator.
- [Customizing the site](./customization.html) — your name, logo, navigation,
  and components instead of the defaults.
- [Publishing your docs](./publishing.html) — production builds, base URLs, and
  hosting.
- [Troubleshooting](./troubleshooting.html) — if something didn't work.
