---
'@doc-kit/core': major
'@doc-kit/cli': major
---

Remove the `legacy-json` and `legacy-json-all` generators, and with them the `@node-core/doc-kit-legacy` package, now that Node.js builds the JSON of its API docs with the `json` and `json-all` generators. The `getRemarkRehype` and `rehypeOptions` exports of `@doc-kit/core`'s `utils/remark.mjs`, which only they used, are removed too
