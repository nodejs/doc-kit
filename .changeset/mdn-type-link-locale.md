---
'@node-core/doc-kit': patch
---

Pin the `en-US` locale on builtin MDN type links that carry a hash fragment
(e.g. `number`, `string`, `any`). Locale-less MDN URLs redirect to the
visitor's preferred language, where heading anchor IDs are translated, so the
original fragment (e.g. `#number_type`) no longer matches any anchor and the
link fails to jump to the target section.
