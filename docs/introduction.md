# Why doc-kit

doc-kit is a documentation toolkit for APIs. It reads your API from Markdown
and MDX, and turns it into documentation: a website with search, JSON
described by a schema, `llms.txt` for language models, man pages, and any
other format a generator can write. doc-kit doesn't read TypeScript or JSDoc
itself: the experimental [`@doc-kit/typedoc`](./packages/typedoc.md) plugin
turns them into Markdown first.

It's the toolkit behind the [Node.js API reference](https://nodejs.org/api).
This page explains what sets it apart, and when another tool may suit you
better.

## Built around the API

doc-kit reads the API described in your Markdown, not only its text. A
heading like `server.listen(port[, callback])` is a method with its signature,
the list under it holds its typed parameters, a YAML comment holds its
history, and a `Stability:` blockquote says where it is in its lifecycle. That
structure is part of [doc-kit's Markdown specification](./specification.md),
so every output gets it as data, not as text that happens to look like an
API:

- types in braces link to their documentation: on your site, on MDN, or
  wherever your type map points;
- pages show each entry's history, stability and source;
- the JSON output carries all of it, described by a published schema.

For TypeScript projects, the `@doc-kit/typedoc` plugin writes that Markdown
from the source and its JSDoc comments. See
[Documenting TypeScript](./typescript.md).

## One parse, every output

Each output comes from a [generator](./generators.md): a module that names the
generator it reads from and writes its own format. doc-kit loads the generators
a build asks for, along with the ones they read from, wires them into a graph,
parses your sources once, and runs the generators that don't depend on one
another at the same time.

A format of your own, such as an RSS feed, a changelog or TypeScript
declarations, is one more module reading the same typed API entries as the
website. You pass its path to `--target` like any built-in name. See
[Creating generators](./creating-generators.md).

## Performance

The heavy stages, from parsing Markdown to rendering the website, split their
work into chunks and run them on worker threads: one per CPU core, up to four,
unless you set [`--threads`](./cli.md).

Memory stays low too. Each stage's result is dropped as soon as the last
generator reading it is done with it, and the website generator holds one page
per worker, so its memory follows your largest page rather than the size of
the whole site.

Building this site, 40 pages, with its own
[configuration](https://github.com/nodejs/doc-kit/blob/main/www/doc-kit.config.mjs):

| Targets                     | Output                                | Time   |
| --------------------------- | ------------------------------------- | ------ |
| `llms-txt`                  | `llms.txt`                            | 0.51 s |
| `orama-db`                  | The search index                      | 0.55 s |
| `json`                      | 40 JSON documents                     | 0.56 s |
| `html`                      | The site: 40 pages, bundled with Vite | 2.85 s |
| The configuration's targets | All of it, 213 files                  | 2.90 s |

Most of the website's time is Vite bundling its scripts and styles once, a
cost that doesn't grow with the number of pages. The Node.js v26.12.1 API docs
show how the rest scales, with 71 files, built with the
configuration of [the Node.js preview site](https://beta.docs.nodejs.org/):

| Targets                                         | Output               | Time   |
| ----------------------------------------------- | -------------------- | ------ |
| `llms-txt`                                      | `llms.txt`           | 2.2 s  |
| `orama-db`                                      | The search index     | 2.6 s  |
| `json`                                          | 71 JSON documents    | 2.6 s  |
| `section-pages`                                 | The site: 794 pages  | 9.7 s  |
| `section-pages`, `json`, `llms-txt`, `orama-db` | All of it, 937 files | 10.1 s |

Each time is the median of five clean builds on an AMD Ryzen 9 8945HX
(32 threads, 4 used by doc-kit) with Node.js 24.18 and doc-kit
`12a5473`. To measure them on your machine, run this from a doc-kit
checkout with its dependencies installed. It checks out the Node.js docs
once, builds both sites, and writes the results to
`www/theme/benchmarks.json`, which the home page reads:

```bash
node scripts/benchmark.mjs --runs 5 --node v26.12.1
```

## Light by default

The [website generator](./generators/html.md) renders every page to static
HTML at build time, and the content is never shipped as JavaScript. Only the
interactive parts load code, as islands: the search box, the theme switch, the
sidebar and announcement banners hydrate once the browser is idle, and a code
block hydrates the first time you point at, focus or touch it, for its copy
button and tabs.

In browsers with the Navigation API, following a link to another page of the
site swaps it in place, without a full reload. Pages are prefetched when you
hover over or press a link, so most navigations don't wait on the network.

## Used by

A few places doc-kit is already in use. Feel free to open a pull request to
add yours.

- <https://nodejs.org/api> - `legacy-html`, `legacy-json`
- <https://nodejs.org/llms.txt> - `llms-txt`
- <https://beta.docs.nodejs.org/> - `html`, `orama-db`, `llms-txt`
- <https://nodejs.org/learn> - `html`, `orama-db`, `llms-txt`
- <https://webpack-doc-kit.vercel.app/> - `html`, `orama-db`, `llms-txt`
- <https://undici.nodejs.org/> - `html`, `orama-db`, `llms-txt`

## When to use something else

doc-kit is made for documenting APIs. If your site is mostly prose, without an
API behind it, a general-purpose site generator such as
[VitePress](https://vitepress.dev/), [Docusaurus](https://docusaurus.io/) or
[Eleventy](https://www.11ty.dev/) may suit you better. doc-kit handles guides
well too, as this site shows, but they aren't why it exists.

If your docs have an API behind them, [Getting started](./getting-started.md)
takes you from one Markdown file to a site with search in a few minutes.

## Get involved

doc-kit is an open source project of the Node.js organization. Bug reports,
ideas and pull requests are welcome in the [issue tracker][], and the
[contributing guide][] explains how to set up the repository. You can find the
team in the `#nodejs-doc-kit` channel on [the OpenJS Slack][].

[issue tracker]: https://github.com/nodejs/doc-kit/issues
[contributing guide]: https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md
[the OpenJS Slack]: http://slack.openjsf.org/
