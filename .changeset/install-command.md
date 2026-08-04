---
'@nodejs/doc-kit': minor
---

Add `doc-kit install [generators...]`: installs the packages providing the
given built-in generators (e.g. `doc-kit install html` installs
`@nodejs/doc-kit-generator-react`). Without arguments, it installs whatever
the `target` in your configuration file needs. The package manager is
detected from the project lockfile, and packages land in `devDependencies`
unless the project depends on doc-kit in production.
