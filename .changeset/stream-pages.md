---
'@doc-kit/core': minor
'@doc-kit/generator-react': minor
---

`jsx-ast` and `html` stream their input: with more than one thread, page building and rendering overlap with the generators before them. `html` bundles as soon as every page's metadata is known, and renders pages as they are built. Streaming leaves the generated files unchanged, but `jsx-ast` now yields pages in the order their entries arrive, not the order the site lists them, and, once every page has arrived, a `{ manifest }` item listing their heads in that order. To list the pages as the site does, skip the `{ manifest }` item and sort them with `headingSortFn`, now exported from `@doc-kit/generator-react/jsx-ast/utils/getSortedHeadNodes`, as `pages.toSorted((a, b) => headingSortFn(a.data, b.data))`, keeping the synthetic pages (`data.synthetic`) last. Bundler adapters' `compile` can now be called before and while `buildServer` and `buildClient` run. `createChannel` and `merge`, from `@doc-kit/core/utils`, are the queue and the merge of async iterables they are built on.
