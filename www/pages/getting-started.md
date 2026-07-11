# Getting started

This page takes you from an empty directory to a rendered documentation page.

## Install

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

Open `out/all.html`.

## Render the modern site

The `web` target produces the server-rendered, client-hydrated site that
nodejs.org uses — and that this site is built with:

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
static server does; for example:

```bash
npx serve out
```

Then open the printed URL (usually <http://localhost:3000>). The
`legacy-html-all` output from earlier has no such requirement — `out/all.html`
opens straight from disk.

## Next steps

- [Configuration](./configuration.html) — move these flags into
  `doc-kit.config.mjs`.
- [Customize the `web` generator](./generator-web.html) — theming, `head`, and
  custom templating
- [Read the full input specification](./specification.html) — the full Markdown
  contract. components.
