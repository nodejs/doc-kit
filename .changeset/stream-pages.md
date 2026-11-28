---
'@doc-kit/generator-react': minor
---

`jsx-ast` and `html` stream their input, so with more than one thread, page building and rendering overlap with the generators before them. The generated files are unchanged, but `jsx-ast` now yields pages in the order their entries arrive, and once every page has arrived, a `{ manifest }` item listing their heads in the site's order, the synthetic pages last. Bundler adapters' `compile` can now be called before and while `buildServer` and `buildClient` run.
