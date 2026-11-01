---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
'@node-core/doc-kit': minor
---

`all.html` moves out of the `html` generator into a new Node.js generator, `html-all` (`@node-core/doc-kit`), and `html`'s `generateAllPage` option is removed. `html-all` is spliced between `jsx-ast` and `html`, and adds `all.html`, every module page's content on one page, as a page made of theirs. `html` renders such a page, given with `parts`, the pages it is made of, from their compiled content. Builds that want `all.html` add the `html-all` target.
