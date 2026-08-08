# Caching and Incremental Builds

doc-kit keeps a durable on-disk cache between runs so that rebuilds only redo
the work a change actually affects. Caching is **on by default** and designed
to be invisible: every cache failure — corruption, version mismatch, deleted
files — silently degrades to a full, correct rebuild. If you ever get a wrong
output out of a cached build, that is a bug; please report it rather than
scripting around it.

## What you get

- **No-change rebuilds are skipped entirely.** When the input files,
  configuration, and generator code are unchanged and every previously
  written output still verifies on disk, the run finishes in well under a
  second without loading any generator.
- **Partial rebuilds.** After editing one document, `legacy-html` re-renders
  (and re-highlights, and re-minifies) only that document; the react `html`
  generator rebuilds only the edited page's JSX and server-rendered HTML.
  Pages whose bytes did not change are not rewritten, so their mtimes are
  stable for downstream tooling.
- **Honest floors.** Markdown parsing and metadata extraction always re-run
  (they are as fast as reading the cache would be), the synthetic `all` page
  is rebuilt whenever anything changed (it folds every module by design), and
  the client Vite build always runs over the full graph (partial input sets
  change chunk hashing). For fast dev loops on large corpora, disable the all
  page:

  ```js
  export default {
    'jsx-ast': { generateAllPage: false },
  };
  ```

## How invalidation works

Cache keys are content hashes — never timestamps. Every key is salted with
the resolved configuration (including the parsed changelog, index, and the
fetched `typeMap` bytes) and a cache schema version.

Anything the cache cannot fully account for (for example a theme `imports`
alias pointing at a directory) makes the affected entries uncacheable rather
than possibly stale.

Generator _code_ is identified by the cache schema version alone: doc-kit
bumps it in releases whose generated output changes, so releases that don't
change output keep existing caches valid. When developing doc-kit or a custom
generator locally, code edits do not invalidate the cache on their own —
build with `--force` while iterating.

## Configuration

```js
export default {
  cache: {
    enabled: true, // default
    dir: 'node_modules/.cache/doc-kit', // default (falls back to .doc-kit-cache)
    maxAgeDays: 7, // age-based object pruning
  },
};
```

CLI flags:

| Flag                 | Effect                                        |
| -------------------- | --------------------------------------------- |
| `--no-cache`         | Disable reads and writes for this run         |
| `--force`            | Ignore existing entries; still write new ones |
| `--cache-dir <path>` | Override the cache directory                  |

## CI usage

The cache is relocatable: keys contain no absolute paths, and outputs are
never inputs. Restoring the cache directory (for example with
`actions/cache`, keyed however you like — the cache self-invalidates by
content) turns unchanged-doc CI builds into sub-second no-ops:

```yaml
- uses: actions/cache@v4
  with:
    path: node_modules/.cache/doc-kit
    key: doc-kit-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
```

The output directory can always be deleted independently of the cache; a warm
run regenerates it byte-for-byte.

## Guarantees

Cold builds are byte-identical across runs and across threading/chunking
topologies; cached builds are byte-identical to `--no-cache` builds; a wiped
output directory or a corrupted cache silently recovers; and one-file edits
rebuild exactly the affected outputs.
