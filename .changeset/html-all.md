---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
'@node-core/doc-kit': minor
---

`all.html` moves out of the `html` generator into a new Node.js generator, `html-all` (`@node-core/doc-kit`), and `html`'s `generateAllPage` option is removed. `html-all` is spliced between `jsx-ast` and `html`, and adds `all.html`, every module page's content on one page, as a composed page. `html` renders a composed page, given with `parts`, from its parts' compiled content, one part at a time rather than building every part's elements first. Builds that want `all.html` add the `html-all` target.
