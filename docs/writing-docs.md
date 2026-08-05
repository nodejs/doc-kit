# Writing documentation

`doc-kit` reads GitHub Flavored Markdown, so everything you already know
applies. On top of it, a handful of conventions get special treatment.

## The smallest document

```markdown
# hello

A one-line description of the module.
```

The level-one heading is the page's identity: it becomes the sidebar label
and the output filename. Every file needs exactly one, at the top.

## Where this departs from plain Markdown

- `{curly braces}` in prose and lists are [type annotations](#types-that-link-themselves),
  not literal text.
- Blockquotes beginning with `Stability:` are [stability indicators](#stability).
- HTML comments beginning with `YAML` (and `key=value` comments) are
  [metadata](#recording-history), not ignored text.

Everything else is standard GFM.

## Documenting an API

Each heading below the title starts an _entry_. Write the heading the way
API docs are conventionally written, and `doc-kit` classifies it — no
annotation needed:

```markdown
## Class: `http.Server`

### `new Agent([options])`

### `server.listen(port[, callback])`

### `server.maxHeadersCount`

### Static method: `Buffer.from(string[, encoding])`

### Event: `'close'`
```

Parentheses make a method; their absence makes a property; `Class:`,
`Static method:`, and `Event:` prefixes mark those kinds; `new X()` marks a
constructor. Optional parameters go in square brackets — `[, callback]` —
nesting where needed: `buf.write(string[, offset[, length]])`.

Headings that match none of these patterns (like `## Synopsis`) are ordinary
sections, which is exactly right for prose. Wrap identifiers in backticks;
leave prose headings unwrapped.

## Parameters and return values

Directly under an entry's heading, an unordered list describes its
parameters. Each item is a name, a type in braces, and prose:

```markdown
### `fs.readFile(path[, options], callback)`

- `path` {string|URL} The file to read.
- `options` {Object}
  - `encoding` {string} **Default:** `'utf8'`.
  - `signal` {AbortSignal} Allows aborting the read.
- `callback` {Function}
- Returns: {Promise} Fulfills with the file contents.
```

- Nested lists document the properties of an object parameter, to any depth.
- `` **Default:** `value` `` marks a parameter optional and records its
  default.
- `Returns:` describes the return value; `Extends:` names a class's
  superclass; `Type:` gives a property's type.

The list is lifted out of the prose and becomes structured data — rendered
as parameter tables in HTML, fields in JSON, and so on.

## Types that link themselves

Anything in `{braces}` — in a list or mid-prose — is a TypeScript type
expression, rendered as code with each type name resolved to a link:

```markdown
- `data` {string|Buffer} The payload.

On success, returns a {Promise} that fulfills with a {stream.Readable}.
```

Names resolve in tiers: your configured type map first, then JavaScript
built-ins, then Web APIs on MDN, and finally `module.Name` patterns link to
the matching page in your own docs. A name nothing recognizes stays plain
text — that's fine, not an error.

## Recording history

An HTML comment holding YAML, placed right after a heading, records an
entry's life story:

```markdown
### `hello.greet(name)`

<!-- YAML
added: v1.2.0
changes:
  - version: v2.0.0
    pr-url: https://github.com/me/hello/pull/42
    description: Invalid names now throw instead of returning `null`.
-->
```

`added`, `deprecated`, and `removed` take a version (or an array of versions,
for backports); `changes` is a chronological list of notable changes with
their pull requests. The HTML generator renders this as a version-history
widget; JSON consumers get it as data.

## Stability

A blockquote in the exact form below marks an entry's lifecycle stage —
`0` (deprecated), `1` (experimental, with optional `1.0`/`1.1`/`1.2`
sub-levels), `2` (stable), or `3` (legacy):

```markdown
### `hello.shout(name)`

> Stability: 1 - Experimental. May change without notice.
```

Place it after the YAML comment (if any) and before the parameter list. On
the title heading, it applies to the whole page.

## Code samples

Use fenced code blocks with a language identifier. An optional `displayName`
labels the block in rendered output:

````markdown
```js displayName="Reading a file"
const data = await fs.readFile('/path/to/file');
```
````

## Linking between pages

Link to other documents by their source filename — the `.md` extension is
rewritten to the right output extension at build time:

```markdown
See [`hello.greet()`][] for the simple form.

[`hello.greet()`]: hello.md#hellogreetname
```

Reference-style links with the definitions collected at the bottom of the
file keep prose readable. References to system calls like `open(2)` link to
their man pages automatically.

## Pages that aren't API reference

Guides and tutorials need nothing special, most of the time. Headings that
match none of the patterns above stay ordinary sections.

The exception is a page whose headings _do_ look like signatures but aren't
module exports. A `type` directive under the title reclassifies the whole
document, so those entries render as conceptual sections instead:

```markdown
# C++ addons

<!--type=misc-->
```

Frontmatter (`---`-delimited YAML) at the top of a file is also accepted and
treated as metadata. And if a page needs real components — heroes, tabs, live
examples — name it `.mdx` and use JSX directly; see
[Customizing the site](./customization.md#custom-components-and-mdx).

## The full contract

This page covers what most documents use, but a full
[specification](./specification.md) is also available.
