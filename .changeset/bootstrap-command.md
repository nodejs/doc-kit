---
'@nodejs/doc-kit': minor
---

Add `doc-kit bootstrap [generators...]`: sets a project up end to end — a
`doc-kit.config.mjs` whose naming and versioning are imported straight from
`package.json`, a documentation directory (detected, or created with a
starter page), a `.gitignore` entry for the output, and the generator
packages installed. `doc-kit bootstrap` followed by `doc-kit serve` is all a
new project needs. Prompts for its few decisions on a TTY; `--yes` accepts
the defaults.
