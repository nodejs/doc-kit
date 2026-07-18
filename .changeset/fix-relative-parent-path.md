---
'@node-core/doc-kit': patch
---

Fix `relative()` URL resolution when the target path is a prefix of the current
page's path (e.g. `/generators` from `/generators/web`): the target's final
segment was consumed as a common directory, producing `.` instead of
`../generators`. Unreachable in flat page layouts; surfaced by sites with
nested input directories.
