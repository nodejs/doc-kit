---
'@doc-kit/core': minor
'@doc-kit/cli': patch
'@doc-kit/generator-react': patch
---

Builds hold less in memory. The nodes of `metadata`'s entries no longer keep their `position` in the source, so neither does the output of `json-simple`, now about a third of its size. Each chunk of a streamed output is let go once every generator reading it has read that chunk, rather than once they have all read all of it, and `runGenerators(configuration, { results: false })` keeps none of the requested generators' output, which the CLI now uses. A page made of other pages' content, such as Node.js's `all.html`, renders one part at a time, rather than building every part's elements first.
