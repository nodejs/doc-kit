# `html-all` Generator

The `html-all` generator adds `all.html`, every module page's content on one
page, to the pages the [`html`](./html.md) generator renders. It builds nothing
itself: it is spliced between `jsx-ast` and `html`, passes the pages on, adds
`all.html`'s metadata to the manifest, and once every module page has passed,
adds a page made of theirs. `html` assembles it from their compiled content,
so no module is built twice.

The module pages are its parts, in the order the sidebar lists them; the
index, section pages and the other synthetic pages are left out.

```sh
npx @doc-kit/cli generate -t web -t html-all -i "doc/api/*.md" -o out
```

## Configuring

It has no options of its own.
