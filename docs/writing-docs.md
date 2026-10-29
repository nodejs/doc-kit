# Writing documentation

doc-kit reads GitHub Flavored Markdown, plus a handful of conventions that
turn a page into an API reference: headings written as signatures, typed
parameter lists, version history and stability. This page covers what most
documents use. The [Markdown specification](./specification.md) is the full
contract.

> [!TIP]
> Documenting a TypeScript or JavaScript project?
> [`@doc-kit/typedoc`](./packages/typedoc.md) writes this Markdown for you,
> from your source code and its JSDoc comments. See
> [Documenting TypeScript](./typescript.md).

## The smallest document

```markdown displayName="docs/kittens.md"
# Kittens

The `kittens` module adopts, feeds and pets kittens.
```

Start every file with one level-one heading. Its text is the page's title: it
names the browser tab and, unless you configure the sidebar yourself, the
page's link in the sidebar. The website skips a file that has headings but no
level-one heading. The first paragraph is the page's description, which
[`llms.txt`](./generators/llms-txt.md) lists next to the link.

The output file follows the source path, not the title: with `docs/**/*.md` as
input, `docs/kittens.md` becomes `kittens.html`.

## What differs from GitHub Markdown

Everything GitHub Markdown does still works. On top of it:

- Text in curly braces is a [type annotation](#types-that-link-themselves):
  `{string}` renders as code that links to the type's documentation. Put
  literal braces in a code span.
- Headings written like signatures, such as `` `kittens.adopt(name)` ``, are
  [API entries](#how-headings-are-classified).
- A list under an entry whose items start with a name and a type is a
  [typed list](#parameters-return-values-and-defaults).
- HTML comments carry metadata: `<!-- YAML` blocks
  [record history](#recording-history), and `<!--key=value-->` comments set
  [page metadata](#page-metadata).
- A blockquote that starts with `Stability:` is a
  [stability indicator](#stability).
- Two or more code blocks in a row become [tabs](#code-samples).
- Links to `.md` files [point to the generated pages](#linking-between-pages).

## Documenting an API

Each heading below the title, down to `#####`, starts an _entry_, and deeper
headings start entries nested inside it. An entry has up to six parts, in this
order: a heading, its history, its stability, its typed list, prose, and code
samples. All but the heading come before the next heading, whatever its level.

![The parts of an API entry in doc-kit Markdown, and what each becomes](./diagrams/entry-anatomy.svg)

Every part after the heading is optional, and most entries use only a few:

````markdown displayName="docs/kittens.md"
## `kittens.adopt(name[, options])`

<!-- YAML
added: v1.0.0
-->

- `name` {string} The kitten's name.
- `options` {Object}
  - `color` {string} Coat color. **Default:** `'tabby'`.
- Returns: {Promise} Fulfills with the adopted kitten.

Adopts a kitten, once the paperwork is done.

```js
const kitten = await kittens.adopt('Mittens');
```
````

The heading makes this a method and gives its signature, the comment records
when it was added, and the list becomes its parameters and return value. The
website renders a signature, a parameter table and a version history; the
[JSON output](./generators/json.md) keeps each part as data.

## How headings are classified

doc-kit reads an entry's kind from its heading, with no annotation needed:

| Heading                                      | Kind          |
| -------------------------------------------- | ------------- |
| `` ## Class: `kittens.Kitten` ``             | Class         |
| `` ### `new kittens.Kitten(name)` ``         | Constructor   |
| `` ### Static method: `Kitten.from(json)` `` | Static method |
| `` ### `kitten.pet([times])` ``              | Method        |
| `` ### `kitten.name` ``                      | Property      |
| `` ### Event: `'purr'` ``                    | Event         |

- The code span must be the whole heading, after any prefix:
  ``### `kitten.pet()` again`` is a plain section.
- Optional parameters go in square brackets, nested when one only makes sense
  after another: `` `kitten.groom(brush[, side[, strokes]])` ``. A rest
  parameter is written `[...names]`. Leave types and defaults out of the
  heading; they belong in the typed list.
- Anything else, like `## Synopsis`, is a plain section. Write those headings
  in plain words, without backticks.

Entries nest by heading level, so put a class's constructor, methods,
properties and events one level below the class. The specification's
[entry type classification](./specification.md#43-entry-type-classification)
and [signature syntax](./specification.md#5-signature-syntax) give the exact
rules.

## Parameters, return values and defaults

Under the heading, and after any history or stability, a typed list describes
what the entry takes and returns. Each item is a name in a code span, a type
in curly braces, and a description:

```markdown
### `kitten.feed(food[, options])`

- `food` {string|string[]} What to serve.
- `options` {Object}
  - `portion` {number} Grams per serving. **Default:** `50`.
  - `signal` {AbortSignal} Cancels the meal.
- Returns: {Promise<boolean>} Fulfills with `true` once the bowl is empty.
```

- Nested lists describe the properties of an object, to any depth.
- `**Default:**` followed by the value in a code span records a default and
  makes the parameter optional. Square brackets in the heading make it
  optional too.
- Three prefixes stand in for the name: `Returns:` for a return value, `Type:`
  for a property's type, and `Extends:` for a class's parent class.

The same list works for the other kinds. An event's list describes the
arguments its listeners receive:

```markdown
## Class: `kittens.Kitten`

- Extends: {EventTarget}

### `kitten.name`

- Type: {string}

### Event: `'purr'`

- `volume` {number} How loud, from 1 to 10.
```

A list whose first item has a name but no type stays a plain list; see
[Typed Parameter Lists](./specification.md#9-typed-parameter-lists) for how
doc-kit recognizes one.

On the website, a typed list becomes a table, under the signature for methods
and constructors. In JSON, each item's name, type, description, default and
whether it's optional become fields.

## Types that link themselves

Curly braces hold a TypeScript type, in a typed list or anywhere in prose.
doc-kit renders it as code and links each type name in it to its
documentation:

```markdown
- `food` {string|string[]} What to serve.

`kittens.adopt()` returns a {Promise} that fulfills with a {kittens.Kitten}.
```

Anything valid on the right of a TypeScript `type X =` works, including
unions, arrays and generics such as `{Promise<boolean>}`. doc-kit looks each
name up in order, and the first match wins:

1. Your [type map](#the-type-map). Its names are case-sensitive and may
   contain spaces.
2. JavaScript primitives and keywords, such as `string`, `number`, `null` and
   `any`, linked to MDN.
3. JavaScript's built-in objects and the Web APIs documented on MDN, such as
   `Promise`, `Map`, `AbortSignal` and `URL`.
4. Dotted names, which link into your own docs: the part before the first dot
   names the page. `{kittens.Kitten}` links to the `Class:` heading on the
   `kittens` page (a capitalized last part means a class), and
   `{kittens.breeds}` to the `kittens.breeds` property.

Steps 2 and 3 ignore case. A name that nothing matches stays plain text inside
the code, which is fine. If the braces don't hold a valid type, doc-kit logs a
warning and renders the text as plain code.

### The type map

For your own types, and other projects' types, write a JSON file that maps
names to URLs:

```json displayName="type-map.json"
{
  "Litter": "https://example.com/docs/litter",
  "Adoption options": "kittens.html#kittensadoptname-options"
}
```

Then point `metadata.typeMap` at it, or pass it to the CLI's
[`--type-map`](./cli.md) option:

```js displayName="doc-kit.config.mjs"
export default {
  metadata: {
    typeMap: './type-map.json',
  },
};
```

`typeMap` takes a URL, or a path read from the directory you run doc-kit in.
A relative URL in the map is relative to the output root, and doc-kit adjusts
it for each page.

## Recording history

An HTML comment that starts with `YAML`, right after an entry's heading,
records the entry's history:

```markdown
### `kittens.adopt(name[, options])`

<!-- YAML
added: v1.0.0
changes:
  - version: v2.0.0
    pr-url: https://github.com/you/kittens/pull/42
    description: The `color` option accepts any CSS color.
deprecated: v3.0.0
-->
```

| Field        | What it records                                                                    |
| ------------ | ---------------------------------------------------------------------------------- |
| `added`      | The version the entry first shipped in.                                            |
| `deprecated` | The version that deprecated it.                                                    |
| `removed`    | The version that removed it.                                                       |
| `changes`    | Notable changes, each with a `version`, a `pr-url` and a `description` (Markdown). |

A version is a string such as `v1.0.0`. Use a list of versions for a change
that was backported to older release lines. The website shows the history next
to the heading, and JSON keeps it as data.

## Stability

A blockquote that starts with `Stability:`, a level and a label marks an
entry's stage in its lifecycle. The website renders it as a colored box, like
this one:

> Stability: 2 - Stable. This box is a live stability indicator.

Place it after the history comment, if there is one, and before the typed
list. The text after the level is yours: explain, link to an alternative, or
continue on more lines.

```markdown
### `kittens.adopt(name[, options])`

<!-- YAML
added: v1.0.0
-->

> Stability: 1 - Experimental. The adoption fee may change.

- `name` {string} The kitten's name.
```

The specification lists the [levels](./specification.md#72-levels) and
[sub-levels](./specification.md#73-sub-levels). On the title, a stability
indicator applies to the whole page.

## Code samples

Fence code samples with a language, so the website can highlight them. Two or
more code blocks in a row become one block with a tab each. A tab is labelled
by its block's `displayName`, or by its language when it has none (`cjs` and
`mjs` read as CJS and ESM):

````markdown
```bash displayName="npm"
npm install kittens
```

```bash displayName="pnpm"
pnpm add kittens
```
````

That renders as:

```bash displayName="npm"
npm install kittens
```

```bash displayName="pnpm"
pnpm add kittens
```

To keep blocks apart, put a sentence between them. The JSON output lists each
entry's code samples, with their language and `displayName`.

## Alerts

GitHub's alert syntax renders as a callout, like the tip at the top of this
page:

```markdown
> [!WARNING]
> Kittens adopted before eight weeks of age need extra care.
```

The five kinds are `NOTE`, `TIP`, `IMPORTANT`, `WARNING` and `CAUTION`.

## Linking between pages

Link to other pages by their source file, with a relative path. doc-kit
rewrites the `.md` extension to the output's `.html`:

```markdown
See [`kittens.adopt()`][] for the details, or the [care guide](care.md).

[`kittens.adopt()`]: kittens.md#kittensadoptname-options
```

Anchors are heading slugs, made much as GitHub makes them:
`` ## `kittens.adopt(name[, options])` `` becomes `#kittensadoptname-options`,
and `` ## Class: `kittens.Kitten` `` becomes `#class-kittenskitten`. When in
doubt, copy the link from the heading on the rendered page.

Reference-style links, with their definitions at the end of the file, keep
long pages readable. A system call written like `open(2)` in plain text (not
in a code span) links to its Linux manual page.

## Page metadata

One-line comments right after the title set metadata for the whole page:

```markdown
# Kittens

<!--introduced_in=v1.0.0-->
<!--source_link=lib/kittens.js-->
<!--llm_description=Adopt, feed and pet kittens.-->
```

| Directive         | What it does                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| `introduced_in`   | The version the module first shipped in, shown with the page's history.      |
| `source_link`     | Links the page to the file that implements it, in your repository on GitHub. |
| `llm_description` | Describes the page in `llms.txt`, in place of its first paragraph.           |
| `type`            | What the page documents: `module` (the default), `misc` or `global`.         |
| `name`            | The module's name in JSON output, when it isn't the file name.               |

A frontmatter block at the top of the file does the same job with YAML keys:
any of the directives above or the history fields, plus `title`, which
replaces the heading's text in the browser tab, and `mdx`, described in
[MDX pages](#mdx-pages).

```markdown
---
title: Adopting kittens
introduced_in: v1.0.0
---

# Kittens
```

## Guides and API pages

Guides need nothing special: headings that don't look like an API stay plain
sections. Still, doc-kit treats every page as documenting a module unless its
`type` directive says otherwise:

```markdown
# Caring for your kitten

<!--type=misc-->
```

`misc` marks a guide or another conceptual page: JSON output records the
page's `type` as `misc`, with no module name. `global` marks a page of
globals, which need no import, and JSON gives its entries a global scope.

The directive doesn't change how headings are classified: on a `misc` page,
`` ## `kitten.pet()` `` is still a method. When a heading looks like an API
but isn't an entry, write it in plain words, or override its kind in its YAML
comment so that it becomes a plain section:

```markdown
### `kitten.whiskers`

<!-- YAML
type: misc
-->
```

## MDX pages

When a page needs components, such as a landing page or a live demo, write it
in MDX: name the file `.mdx`, or set `mdx: true` in a Markdown file's
frontmatter (`mdx: false` turns an `.mdx` file back into Markdown).

```mdx displayName="docs/index.mdx"
---
title: Kittens
---

# Kittens

Everything about adopting, feeding and petting kittens.

<DocumentationIndex />
```

`<DocumentationIndex />` is built in: it lists every page with its stability
and description. Components you register yourself work too; see
[Customizing the site](./customization.md#custom-components-and-mdx).

In MDX, curly braces are JavaScript expressions, not types, so typed lists
stay plain lists and type names don't link. HTML comments aren't valid MDX
either, so set page metadata in frontmatter, write comments as `{/* ... */}`,
and keep entries that need history in Markdown pages. Headings and stability
indicators work as they do in Markdown.

## Learn more

- The [Markdown specification](./specification.md) is the full contract for
  the format, edge cases included.
- [Documenting TypeScript](./typescript.md) generates these pages from your
  source code.
- [Customizing the site](./customization.md) covers navigation, the theme and
  components.
