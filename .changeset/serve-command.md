---
'@nodejs/doc-kit': minor
---

Add `doc-kit serve`: generates the documentation, serves the output locally
(port 3000 by default, falling back to the next available port or honoring
`--port`), and regenerates whenever the input files change. `--static` serves
an existing output directory as-is, without generating or watching.
