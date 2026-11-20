---
'@doc-kit/core': minor
---

Builds use up to 6 threads by default, instead of 4: with generators streaming into each other, more threads now pay off. On the Node.js API docs, the site build is ~15% faster at 6 threads than at 4, for ~20% more memory, while 8 threads were no faster than 6. `--threads` still sets any count.
