# Search index

The `orama-db` generator builds the search index behind the
[website](https://doc-kit.nodejs.org/generators/html)'s search box: an
[Orama](https://github.com/oramasearch/orama) database with one document per
heading in your docs. Build it alongside `html` whenever your site should have
search.

## Usage

```bash
npx @doc-kit/cli generate -t html -t orama-db -i "docs/**/*.md" -o out
```

Building both in one run adds a search box to the site's navigation bar, which
Ctrl+K or Cmd+K also opens.

## Configuring

`orama-db` has no options of its own. It reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options).
Keep its `output` the site's output directory, since the search box loads the
index from the site root.

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
