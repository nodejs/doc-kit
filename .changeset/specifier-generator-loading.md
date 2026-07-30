---
'@nodejs/doc-kit': minor
---

Generators are now loaded dynamically by import specifier instead of a static
registry. `--target` accepts either a built-in shorthand name (`web`,
`legacy-html`, …) or any import specifier resolving to a generator module
(e.g. `some-package/generator` or `./my-generator.mjs`), and a generator's
`dependsOn` is now a full import specifier. This lays the groundwork for
splitting the built-in generators into separate packages and enables
third-party generator packages.
