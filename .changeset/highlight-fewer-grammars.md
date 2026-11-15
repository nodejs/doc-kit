---
'@doc-kit/core': minor
---

Code is highlighted with fewer grammars by default, as each one takes its own memory on every thread: JavaScript (`js`, `mjs`, `cjs`, `javascript`) with TypeScript's grammar, which already highlights types, and C++ (`cpp`, `c++`) with C's. The Shiki plugin's `langAlias` option takes precedence over these defaults, so `{ cpp: 'cpp', 'c++': 'cpp' }` brings back C++'s own grammar, and aliases now keep working once a grammar with the same aliases is registered. A highlighter's `resolveLanguage` now returns the language code is highlighted as, as its Shiki instance names it (`typescript` for `mjs`): highlight with what it returns. Transformers see that language too.
