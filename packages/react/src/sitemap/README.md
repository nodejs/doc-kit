# Sitemap

The `sitemap` generator writes a `sitemap.xml` listing the pages of your site,
so search engines can find them. Build it next to the
[website](https://doc-kit.nodejs.org/generators/html) when you publish your
docs.

**Target:** `sitemap` · **Package:** [`@doc-kit/generator-react`](https://doc-kit.nodejs.org/packages/react) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** `sitemap.xml`

## Usage

A sitemap lists absolute URLs, so the generator needs your site's address,
`baseURL`. There is no flag for it, so set it in your configuration file:

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    baseURL: 'https://docs.example.com',
  },
};
```

```bash
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
npx doc-kit generate -t html -t sitemap -i "docs/**/*.md" -o out
```

This writes the site and `out/sitemap.xml`.

> [!IMPORTANT]
> Without a `baseURL`, every URL keeps the literal placeholder (for example
> `{baseURL}/guide/intro.html`), and nothing warns you about it.

## Configuring

Options go in the `sitemap` section of the
[configuration file](https://doc-kit.nodejs.org/configuration):

- `indexURL` {string} URL template for the site's index page.
  **Default:** `'{baseURL}/'`.
- `pageURL` {string} URL template for each page. **Default:**
  `'{baseURL}{path}.html'`.
- `baseURL` {string} Your site's address, without a trailing slash. Set it here
  to use a different one for the sitemap alone. **Default:** from
  `global.baseURL`.
- `output` {string} The directory to write `sitemap.xml` to. Without one,
  nothing is written. **Default:** from `global.output` (`--output`).

### URL templates

In `indexURL` and `pageURL`:

- `{name}` is replaced by the option of that name, global options included,
  such as `{baseURL}`, `{version}` or `{project}`.
- `{name|fallback}` uses `fallback` (letters, digits and `_` only) when the
  option isn't set.
- `{path}`, in `pageURL` only, is the page's path relative to the base of the
  input glob, with a leading slash and no extension: with `-i "docs/**/*.md"`,
  `docs/guide/intro.md` has the path `/guide/intro`.

A placeholder with no value and no fallback stays in the URL as written.
`baseURL` goes in exactly as written, so `https://docs.example.com/` gives
`https://docs.example.com//guide/intro.html`. Pass a string, not a `URL`
object: the configuration is copied to worker threads, which can't receive
one.

The default `pageURL` matches the files the website writes
(`guide/intro.html`). If your host redirects those to extensionless URLs, as
Vercel with `cleanUrls` and Cloudflare Workers do, drop the extension so
search engines don't crawl redirects (see
[Page URLs](https://doc-kit.nodejs.org/publishing#page-urls)):

```js displayName="doc-kit.config.mjs"
export default {
  sitemap: {
    pageURL: '{baseURL}{path}',
  },
};
```

For docs published per version, give each build its own `baseURL`, such as
`https://docs.example.com/v1.x`, as in
[Publishing several versions](https://doc-kit.nodejs.org/publishing#publishing-several-versions),
and both templates point into that version unchanged. If you put the version
in the templates instead (`'{baseURL}/v{version}{path}.html'`), change
`indexURL` as well (`'{baseURL}/v{version}/'`), and set `global.version` or
`--version`: otherwise `{version}` is the version of the Node.js running
doc-kit.

## What the sitemap lists

- One URL for each level-one (`#`) heading in your input, built from
  `pageURL`. Give each page exactly one `#` heading: a page whose headings all
  start at `##` is left out, and a page with two `#` headings is listed twice.
- The index page, built from `indexURL` and added last. It's added even when an
  `index.md` is already listed as `/index.html`.
- With [section pages](https://doc-kit.nodejs.org/generators/section-pages),
  every section page as well. Add the target to the same run:
  `-t sitemap -t section-pages`.

Each entry's `<lastmod>` is the day of the build (UTC). Its `<changefreq>` and
`<priority>` are fixed:

| Entry     | URL from   | `changefreq` | `priority` |
| --------- | ---------- | ------------ | ---------- |
| Each page | `pageURL`  | `weekly`     | `0.8`      |
| The index | `indexURL` | `daily`      | `1.0`      |

For `docs/index.md` and `docs/guide/intro.md`, with
`baseURL: 'https://docs.example.com'`, the generator writes:

```xml displayName="out/sitemap.xml"
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
  <loc>https://docs.example.com/guide/intro.html</loc>
  <lastmod>2026-10-26</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://docs.example.com/index.html</loc>
  <lastmod>2026-10-26</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>https://docs.example.com/</loc>
  <lastmod>2026-10-26</lastmod>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
</url>

</urlset>
```
