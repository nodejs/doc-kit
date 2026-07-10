# doc-kit

`@node-core/doc-kit` is the documentation toolchain behind the Node.js API
reference. It reads API-shaped Markdown and emits HTML, JSON, man pages,
search indexes, and `llms.txt`.

This site is built by doc-kit, from doc-kit's own repository. The pages you are
reading were produced by the `web` generator.

## It is a pipeline, not a Markdown converter

doc-kit is not a general-purpose Markdown-to-HTML tool. Input is parsed once
into a structured model of an API, and from that single model many output
generators fan out — you run any subset of them in one command:

```
Raw Markdown Files
        │
      [ast]           parse to MDAST
        │
    [metadata]        extract structured API metadata
        │
        ├─► [jsx-ast] ─► [web]       server-rendered site
        ├─► [legacy-html] ─► …-all   classic HTML
        ├─► [legacy-json] ─► …-all   JSON
        ├─► [json-simple]            simplified JSON
        ├─► [llms-txt]               llms.txt
        ├─► [man-page]               man pages
        ├─► [orama-db]               search index
        └─► [sitemap]                sitemap.xml
```

Only some of these are things you ask for by name. `ast`, `metadata`, and
`jsx-ast` are internal stages — they run because something downstream depends on
them, and they are not valid `-t` targets. Everything in the fan-out below
`metadata` is a target you can pass to `-t`, and passing several at once reuses
the one shared parse rather than repeating it. The full list is in the
[generators reference](./generator-web.html).

## The input contract

Because `metadata` is looking for an API document, the shape of your Markdown
matters more than it would in a typical static-site generator. The most
important rule:

> **Every page must begin with a level-one heading.** The first `#` becomes the
> page's identity — its sidebar label and its output filename. A file without
> one produces no page at all, and the build still exits `0`.

See [the specification](./specification.html) for the full input format.

## Start here

- [Getting started](./getting-started.html) — render your first document.
- [Commands](./commands.html) — the `doc-kit` CLI surface.
- [Configuration](./configuration.html) — `doc-kit.config.mjs` reference.
- [Creating generators](./generators.html) — extend the pipeline.
