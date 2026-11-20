---
'@doc-kit/generator-react': minor
---

`jsx-ast` and `html` stream their input: with more than one thread, page building and rendering overlap with the generators before them. `html` bundles as soon as every page's metadata is known, and renders pages as they are built. Streaming leaves the generated files unchanged, but `jsx-ast` now yields pages in the order their entries arrive, not the order the site lists them, and, once every page has arrived, a `{ manifest }` item listing their heads in the order the site lists them, the synthetic pages last. Bundler adapters' `compile` can now be called before and while `buildServer` and `buildClient` run.
