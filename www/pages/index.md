# `doc-kit`

`doc-kit` is an opinionated Markdown parsing tool to structurally transform API
documentation. It's the documentation toolchain behind the Node.js API
reference, found at https://nodejs.org/docs/latest/api/. This site is built by
`doc-kit`, from its own repository. The pages you are reading were produced by
the `web` generator.

> 📣 `doc-kit` is in beta. We'd like feedback within the
> [issue log](https://github.com/nodejs/doc-kit/issues) or by visiting the
> [#nodejs-website Slack Channel](https://openjs-foundation.slack.com/archives/CVAMEJ4UV)
> on [the OpenJS Slack](http://slack.openjsf.org/).

## `doc-kit` is a pipeline, not a Markdown converter

`doc-kit` parses Markdown source files once, emitting output according to
configured generators. You run any subset of them in one command, customize
their logic, or even build your own generator.

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
[generators reference](./generators/web).

## The input contract

Because `metadata` is looking for an API document, the shape of your Markdown
matters more than it would in a typical static-site generator. The most
important rule:

> **Every page must begin with a level-one heading.** The first `#` becomes the
> page's identity — its sidebar label and its output filename. A file without
> one produces no page at all, and the build still exits `0`.

See [the specification](./specification) for the full input format.

## What's next

- [Getting started](./getting-started) — render your first document.
- [Commands](./commands) — the `doc-kit` CLI surface.
- [Configuration](./configuration) — `doc-kit.config.mjs` reference.
- [Creating generators](./generators) — extend the pipeline.

## Showcase

A couple places `doc-kit` is already in use. Feel free to PR yours.

- <https://nodejs.org/api> - `legacy-json`
- <https://beta.docs.nodejs.org/> - `web`
- <https://nodejs.org/learn> - `web`
- <https://webpack-doc-kit.vercel.app/> - `web`
- <https://undici.nodejs.org/> - `web`
