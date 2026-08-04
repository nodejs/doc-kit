# Publishing your docs

`doc-kit generate` writes a fully static site — plain HTML, CSS, and
JavaScript in your output directory. Publishing it is hosting a folder.

## The production build

```bash
npx doc-kit generate
```

Everything lands in your configured `output` directory (`out/` by
convention). Two things to know about the result:

- **The `html` site must be served over HTTP.** Its pages use import maps
  and client-side hydration, so opening the files with `file://` may show
  unstyled or inert pages. Preview a production build the same way you'd
  host it:

  ```bash
  npx doc-kit serve --static -o out
  ```

- **Search requires its index.** If your site uses search, generate the
  index alongside the pages by targeting both generators — `target: ['html',
'orama-db']`, so the search box has data to query.

## Tell doc-kit its public URL

Set `baseURL` to where the site will live. Generators that emit absolute
URLs (e.g., `sitemap`, `llms-txt`) will need it in order to generate their
output.

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    baseURL: 'https://example.com/docs',
  },

  html: {
    // Where a page's canonical URL lives; {path} is filled per page
    pageURL: 'https://example.com/docs{path}.html',
  },
};
```

Projects bootstrapped with `doc-kit bootstrap` get `baseURL` wired to the
`homepage` field of `package.json`. Internal links stay relative by default
(so the site works under any prefix); set `html: { useAbsoluteURLs: true }`
if you need them absolute. This is **highly** recommended.

## Machine-readable companions

Search engines and language models each get their own artifact — add the
generators and they share the same parse:

```js
target: ['html', 'orama-db', 'sitemap', 'llms-txt'],
```

`sitemap` emits `sitemap.xml`; `llms-txt` emits an
[`llms.txt`](https://llmstxt.org/) index of your pages.

## Versioned docs

The version selector in the sidebar is built from your `changelog` — a
release history the generators parse into selectable versions. Point
`global.changelog` at a `CHANGELOG.md` (URL or path) that lists your
releases, and each build renders its `version` with links to the others. A
project without release history simply gets no selector. See the
[configuration reference](./configuration.md) for the accepted formats.
