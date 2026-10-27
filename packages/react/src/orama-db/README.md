# Search index

The `orama-db` generator builds the search index behind the
[website](https://doc-kit.nodejs.org/generators/html)'s search box: an
[Orama](https://github.com/oramasearch/orama) database with one document per
heading in your docs. Build it alongside `html` whenever your site should have
search.

**Target:** `orama-db` · **Package:** [`@doc-kit/generator-react`](https://doc-kit.nodejs.org/packages/react) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** `orama-db.json`

## Usage

```bash
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
npx doc-kit generate -t html -t orama-db -i "docs/**/*.md" -o out
```

Building both in one run adds a search box to the site's navigation bar, which
Ctrl+K or Cmd+K also opens.

## Configuring

`orama-db` has no options of its own. It reads these global options, which you
can also set in an `orama-db` section to apply to it alone:

```js displayName="doc-kit.config.mjs"
export default {
  'orama-db': {
    minify: true,
  },
};
```

- `output` {string} The directory to write `orama-db.json` to. Keep it the
  site's output directory, since the search box loads the index from the site
  root. Without one, nothing is written. **Default:** from `global.output`
  (`--output`).
- `minify` {boolean} Write the index on a single line instead of indented. Its
  nested JSON is mostly indentation, so this makes it about three times
  smaller, and still noticeably smaller once your host compresses it.
  **Default:** `false`, from `global.minify` (`--minify`).

## What gets indexed

The index holds one document per heading on every page, that is, one per
[API entry](https://doc-kit.nodejs.org/generators/metadata). Each document has
four string fields:

| Field         | What it holds                                                                                                                                                                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | The heading's name, prefixed with the names of the headings it sits under (except the page title) and joined with `>`, as in `Kitten > meow`. An API heading contributes only the API's name (`meow` for `kitten.meow([volume])`); other headings keep their inline code in backticks. |
| `description` | The first paragraph under the heading, with inline code kept in backticks. Left out when the section has no paragraph.                                                                                                                                                                 |
| `href`        | The page's path from the site root, with `.html` and the heading's anchor.                                                                                                                                                                                                             |
| `siteSection` | The page's title (its first heading). Search results are grouped by it.                                                                                                                                                                                                                |

For example, this page:

```md displayName="docs/kittens.md"
# Kittens

Everything about `Kitten` objects.

## Class: `Kitten`

A small cat.

### `kitten.meow([volume])`

- `volume` {number} How loud. **Default:** `1`.

Makes the kitten meow.

## Care

- Feed twice a day.
```

becomes these four documents, which `orama-db.json` stores along with Orama's
search indexes:

```json
[
  {
    "title": "Kittens",
    "description": "Everything about `Kitten` objects.",
    "href": "/kittens.html#kittens",
    "siteSection": "Kittens"
  },
  {
    "title": "Kitten",
    "description": "A small cat.",
    "href": "/kittens.html#class-kitten",
    "siteSection": "Kittens"
  },
  {
    "title": "Kitten > meow",
    "description": "Makes the kitten meow.",
    "href": "/kittens.html#kittenmeowvolume",
    "siteSection": "Kittens"
  },
  {
    "title": "Care",
    "href": "/kittens.html#care",
    "siteSection": "Kittens"
  }
]
```

The `meow` description skips the parameter list and takes the paragraph after
it, and `Care` has no description because its section holds only a list.

## How the site uses it

- **The search box shows** when `orama-db` and `html` run together, since
  that's when the website's
  [`showSearchBox`](https://doc-kit.nodejs.org/generators/html#configuring)
  option defaults to `true`. If you build the index in another run, set
  `showSearchBox: true` under `html`.
- **The index loads on the first search**, not with the page, and stays loaded
  as the reader moves between pages. Browsers don't let a page opened from
  disk fetch it, so serve the site over HTTP, with `npx doc-kit preview`
  locally. When it can't be loaded, for example because `orama-db.json` isn't
  at the site root, searches come back empty, and the next search tries again.
- **It's fetched from the site root**, relative to the current page, so a site
  published under a path (`https://example.com/docs/`) finds it too. With
  `html`'s `useAbsoluteURLs` on, it's fetched from `baseURL` instead. Result
  links resolve the same way.
- **Results** come up to 10 at a time as you type, grouped under their page's
  title. Tabs for the pages with the most matches (up to 10) narrow them to one
  page and show up to 25. Each result links to its heading on the full page,
  even when you also build
  [section pages](https://doc-kit.nodejs.org/generators/section-pages).

[Publishing your docs](https://doc-kit.nodejs.org/publishing) covers hosting,
compression and caching.

## Querying it yourself

`orama-db.json` is an Orama database saved with Orama's `save()`, so you can
load it with [`@orama/orama`](https://www.npmjs.com/package/@orama/orama) to
build a search of your own in the browser:

```js displayName="search.mjs"
import { create, load, search } from '@orama/orama';

const db = create({ schema: {} });
const data = await fetch('/orama-db.json').then(response => response.json());

load(db, data);

const { hits } = await search(db, { term: 'meow' });
```

Each hit's `document` has the fields above; resolve its `href` against your
site's root. A generator of your own that names
`'@doc-kit/generator-react/orama-db'` in its `dependsOn` receives the same
saved database (see
[Creating generators](https://doc-kit.nodejs.org/creating-generators)).
