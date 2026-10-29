# Publishing your docs

`doc-kit generate` writes a static site to one directory: the HTML pages,
their scripts and stylesheets, and every other output you target. To publish
it, build with your production settings, then upload that directory to any
static host. This guide covers both, with recipes for common hosts.

## Build for production

In your configuration file, set where the site will live and which version it
documents:

```js displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'orama-db', 'json', 'sitemap', 'llms-txt'],

  global: {
    project: 'Kittens',
    version: '1.0.0',
    input: ['docs/**/*.md'],
    output: 'out',
    baseURL: 'https://kittens.example.com',
    minify: true,
  },
};
```

Then build:

```bash
npx @doc-kit/cli generate
```

Three settings matter most for a published site:

- `baseURL` is the URL the site is published at, without a trailing slash.
  The sitemap, `llms.txt` and absolute links are built from it.
- `version` is the version your docs describe, shown in page titles. Without
  it, titles show the version of Node.js running the build.
- `minify` minifies the pages' HTML, and writes the JSON outputs, the search
  index included, without whitespace. Scripts and stylesheets are minified
  either way. The `--minify` flag sets it too.

> [!WARNING]
> Without `baseURL`, `sitemap.xml` and `llms.txt` are still written, but every
> URL in them starts with a literal `{baseURL}`.

The [configuration reference](./configuration.md#global-options) lists the
other global options.

## Check it locally

```bash
npx @doc-kit/cli preview
```

`preview` serves the output directory on <http://localhost:3000>; see
[`doc-kit preview`](./cli.md#doc-kit-preview) for its options.

Always open the pages over HTTP, never straight from disk. The pages load
their scripts as JavaScript modules, request their stylesheet with CORS, and
fetch the search index. Browsers block all three for `file://` pages, which
then show up unstyled and inert.

The preview server is for checking a build. It doesn't compress responses or
set cache headers, so leave those to your host.

## Ship what the pages link to

Besides its pages and `assets/`, the site links to files that other generators
write, or that you copy in yourself:

| File            | Used by                                                            | How it gets there              |
| --------------- | ------------------------------------------------------------------ | ------------------------------ |
| `orama-db.json` | The search box                                                     | Add `orama-db` to `target`.    |
| `<page>.json`   | The "View as JSON" link on each page                               | Add `json` to `target`.        |
| `<page>.md`     | The "View as MD" link on each page, `llms.txt` and `llms-full.txt` | Copy your Markdown, see below. |
| `404.html`      | Your host, for URLs that don't exist                               | Written by default.            |

The search box only appears when the search index is built in the same run as
the pages. If you build the index separately, set `html.showSearchBox` to
`true`.

To copy files into the output as part of the build, list them in
`pathsToCopy`, relative to the working directory. A string copies a path under
its own name (`'public'` lands in `out/public/`), and an object maps each
source to a path inside the output. The default list is
`['assets', 'public', 'static']`, and setting `pathsToCopy` replaces it rather
than adding to it. This copies your Markdown next to the pages:

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    // docs/kittens.md is published as kittens.md, next to kittens.html
    pathsToCopy: [{ docs: '.' }],
  },
};
```

## Page URLs

Each page is written as `<name>.html`, and the links doc-kit makes between
your pages carry that extension, so the site works on any static host without
configuration. Many hosts also serve a page at its extensionless URL
(`/kittens`), and some redirect `/kittens.html` there, such as Vercel with
`cleanUrls` and Cloudflare Workers by default. The site follows those
redirects when it navigates, so either setup works.

Type links are the exception: doc-kit uses the paths in your type map as
written. Those that [`@doc-kit/typedoc`](./packages/typedoc.md) writes have no
extension, so they need a host that serves `/kittens` from `kittens.html`.

If your host redirects to extensionless URLs, list those in the sitemap, so
search engines don't crawl redirects:

```js displayName="doc-kit.config.mjs"
export default {
  sitemap: {
    // `{path}` is the page's path without its extension, starting with `/`
    pageURL: '{baseURL}{path}',
  },
};
```

The [sitemap](./generators/sitemap.md) and [`llms.txt`](./generators/llms-txt.md)
pages list their URL templates and defaults.

### Hosting under a subpath

Pages reach each other and their assets through relative URLs, so a site
works under any path, such as a GitHub Pages project site at
`https://<owner>.github.io/<repo>/`. Two pages load their assets from the root
of the domain instead: `404.html`, which hosts serve at any missing URL, and
`all.html`. Turn on `useAbsoluteURLs`, and they load them from `baseURL`:

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    baseURL: 'https://owner.github.io/repo',
  },

  html: {
    useAbsoluteURLs: true,
  },
};
```

Every link then points at `baseURL`, so when you preview that build locally,
following a link takes you to the published site. The logo in the default
navigation bar links to the root of the domain either way; to change that,
replace `#theme/Navigation` (see [Customizing the site](./customization.md)).

## Cache the assets

Every file the `html` generator writes to `assets/` (scripts, stylesheets,
fonts) is named after a hash of its content, so a changed file always gets a
new name. Serve that directory with a long-lived, immutable cache, and let
everything else (the pages, the search index) revalidate:

```text
/assets/*   Cache-Control: public, max-age=31536000, immutable
```

Most hosts revalidate every file on every load by default, which costs a
request per asset each time someone opens the site. The Netlify, Vercel and
Cloudflare Workers [host recipes](#host-recipes) below set this header (GitHub
Pages doesn't let you). Within a visit, the site swaps pages in client-side in
browsers that support it, so moving between pages doesn't load the assets
again.

> [!CAUTION]
> Keep your own files out of a project-level `assets/` directory. The default
> `pathsToCopy` copies it into `out/assets/` as is, without hashed names, so a
> changed file would stay cached for a year.

## Compress the pages

Pages, scripts and the search index are text, and shrink a lot when served
compressed (gzip, brotli or zstd). Cloudflare, Vercel, Netlify and GitHub
Pages compress on their own. If you serve the output yourself, turn
compression on:

- **nginx:** `gzip on;` compresses HTML; add the other types with
  `gzip_types text/css text/javascript application/javascript application/json image/svg+xml;`.
- **Caddy:** `encode zstd gzip`.
- **Apache:** with `mod_deflate`,
  `AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json`.
- **Amazon S3:** serve the bucket through CloudFront, with **Compress objects
  automatically** on.

## Host recipes

Each recipe assumes a `doc-kit.config.mjs` that writes to `out`, with
`@doc-kit/cli` (and `@doc-kit/generator-react`, for the site) in your
`devDependencies`.

### GitHub Pages

In your repository's settings, under **Pages**, set the source to **GitHub
Actions**, then add a workflow that builds the site and deploys it:

```yaml displayName=".github/workflows/docs.yml"
name: Publish docs

on:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - run: npm ci
      - run: npx @doc-kit/cli generate
      - uses: actions/upload-pages-artifact@v5
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

GitHub Pages serves `404.html` for missing pages, but doesn't let you set
response headers, so the assets keep its default caching. A project site
lives under a subpath; see [Hosting under a subpath](#hosting-under-a-subpath).

### Netlify

Netlify installs your dependencies, runs the build `command` and publishes the
`publish` directory:

```toml displayName="netlify.toml"
[build]
  command = "npx @doc-kit/cli generate"
  publish = "out"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### Vercel

```json displayName="vercel.json"
{
  "buildCommand": "npx @doc-kit/cli generate",
  "outputDirectory": "out",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

`cleanUrls` serves each page without its `.html` and redirects the `.html` URL
there. Drop it to keep the extensions; otherwise, set the sitemap's `pageURL`
to match (see [Page URLs](#page-urls)).

### Cloudflare Workers

Cloudflare Workers serves the output as static assets. Its response headers
come from a `_headers` file at the root of the output, which `pathsToCopy`
can put there:

```jsonc displayName="wrangler.jsonc"
{
  "name": "kittens-docs",
  "compatibility_date": "2026-10-01",
  "assets": {
    "directory": "./out",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page",
  },
}
```

```text displayName="public/_headers"
/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    // Replaces the default list: copies public/ (with _headers) to the root of
    // out/, and docs/ for the .md files the pages link to
    pathsToCopy: [{ public: '.', docs: '.' }],
  },
};
```

`auto-trailing-slash` serves `/kittens` from `kittens.html` and redirects
`/kittens.html` there, and `404-page` answers missing URLs with `404.html`.
As with Vercel, set the sitemap's `pageURL` to match (see
[Page URLs](#page-urls)). Build, then deploy with Wrangler:

```bash
npx @doc-kit/cli generate
npx wrangler deploy
```

## Publishing several versions

The version selector in the sidebar lists the releases in `global.changelog`
(or `--changelog`); a site built without one has no selector. Build each
version on its own, with its `version` and `baseURL`, and publish it where
`html.pageURL` says it lives:

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    version: '3.0.0',
    baseURL: 'https://kittens.example.com/v3.x',
    changelog: './CHANGELOG.md',
  },

  html: {
    // Where each version's copy of a page lives
    pageURL: 'https://kittens.example.com/{version}{path}.html',
  },
};
```

In `pageURL`, `{version}` becomes `v<major>.x`, or `v<major>.<minor>.x` for a
release whose minor version isn't 0 (`v3.x`, `v2.1.x`), and `{path}` the
page's path.

`changelog` takes a URL or a path to a Markdown file that lists releases one
per line, in the format of the
[Node.js changelog](https://github.com/nodejs/node/blob/main/CHANGELOG.md):

```text displayName="CHANGELOG.md"
* [Node.js 3.0](https://kittens.example.com/v3.x/) Current
* [Node.js 2.1](https://kittens.example.com/v2.1.x/) **Long Term Support**
```

Each line needs the `*` bullet, the literal `Node.js` label, whatever your
project is called, and some notes after the link. Lines in any other shape are
skipped without an error. The link's target is ignored, since the selector
builds its links from `html.pageURL`, and notes that mention "Long Term
Support" mark an LTS release.

In a JavaScript configuration file, you can list the releases instead, each
as `{ version, isLts, isCurrent }` with a version from the `semver` package.
`isCurrent` adds "(Current)" to the release's label in the selector, which the
Markdown file can't do:

```js displayName="doc-kit.config.mjs"
import { coerce } from 'semver';

export default {
  global: {
    changelog: [
      { version: coerce('3.0.0'), isLts: false, isCurrent: true },
      { version: coerce('2.1.0'), isLts: true },
    ],
  },
};
```

Docs built for an older release keep the list they were built with. To update
it without rebuilding them, point `html.remoteConfigUrl` at a JSON file whose
`versions` replace the built-in list; the
[website generator](./generators/html.md#remote-configuration) describes its
shape.

Once your site is online, [Creating generators](./creating-generators.md)
shows how to add outputs doc-kit doesn't ship, such as an RSS feed.
