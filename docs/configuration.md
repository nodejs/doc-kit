# Configuration

`doc-kit` discovers configuration with
[`cosmiconfig`](https://github.com/cosmiconfig/cosmiconfig): run the CLI
from your project directory and it looks for a `doc-kit.config.mjs` (or
`.js`/`.cjs`/`.ts`), a `.doc-kitrc` file (JSON or YAML, with any of the
usual extensions), or a `doc-kit` property in `package.json`. Use
`--config-file <path>` to load a specific file instead of searching.

```mjs displayName="doc-kit.config.mjs"
/** @type {import('@nodejs/doc-kit/utils/configuration/types').Configuration} */
export default {
  // Which generators to run. Built-in names, or import specifiers
  // resolving to custom generator modules.
  target: ['html', 'orama-db'],

  global: {
    input: ['docs/**/*.md'],
    output: 'out',
    version: '1.2.0',
    baseURL: 'https://example.com/docs',
    changelog: [],
  },

  // Generator-specific sections, keyed by generator name
  html: {
    project: 'My Project',
  },
};
```

## How values merge

Three sources, in order of precedence:

1. **CLI flags** (see the [CLI reference](./cli.md)) override
2. **the configuration file**, which overrides
3. **built-in defaults**.

Each generator's section starts from its own defaults, then inherits every
`global` value it doesn't override. So `global.minify` applies to all
targets, while `'legacy-json': { minify: false }` exempts one.

## Global options

| Property      | Type                      | Description                                                                                                                                                                        | Default                          |
| ------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `input`       | `string \| string[]`      | Glob patterns for the source Markdown files. Required (with `target`) to run.                                                                                                      | —                                |
| `output`      | `string`                  | The directory generated files are written to.                                                                                                                                      | —                                |
| `ignore`      | `string \| string[]`      | Glob patterns excluded from `input`.                                                                                                                                               | —                                |
| `version`     | `string`                  | The version of the project being documented (coerced to semver).                                                                                                                   | `process.version`                |
| `changelog`   | `string \| URL \| Array`  | Release history used to build version selectors. A URL or path to a `CHANGELOG.md` to parse, or a pre-parsed array — `[]` disables versioning (and the network fetch).             | The Node.js `CHANGELOG.md`       |
| `index`       | `string \| URL \| Array`  | An `index.md` listing section titles, or a pre-parsed array.                                                                                                                       | —                                |
| `baseURL`     | `string \| URL`           | The public URL of the published site; used wherever absolute links are needed (sitemaps, `llms.txt`, social metadata).                                                             | `'https://nodejs.org/docs'`      |
| `repository`  | `string`                  | GitHub repository in `owner/repo` form, used for source and edit links.                                                                                                            | `'nodejs/node'`                  |
| `ref`         | `string`                  | Git ref (branch, tag, or SHA) used in source links.                                                                                                                                | `'HEAD'`                         |
| `minify`      | `boolean`                 | Minify the output, in whatever form it takes.                                                                                                                                      | `true`                           |
| `pathsToCopy` | `Array<string \| Object>` | Extra files or directories copied into the output. A string copies to `output/<basename>`; a `{ source: destination }` object controls the target path. Missing paths are skipped. | `['assets', 'public', 'static']` |

> The defaults still reflect doc-kit's Node.js origins: `changelog`,
> `repository`, and `baseURL` point at the Node.js project unless you set
> them. `doc-kit bootstrap` writes a configuration that overrides the ones
> your project needs.

## Execution options

Top-level, alongside `target` and `global`:

| Property    | Type     | Description                         | Default        |
| ----------- | -------- | ----------------------------------- | -------------- |
| `threads`   | `number` | Worker threads used for generation. | Your CPU count |
| `chunkSize` | `number` | Items processed per worker thread.  | `10`           |

## Generator options

Each generator documents its own options on its reference page — see the
[generators overview](./generators.md). Two commonly configured ones:

```js
export default {
  html: {
    project: 'My Project',
  },

  metadata: {
    typeMap: {
      MyThing: 'https://example.com/docs/my-thing.html',
    },
  },
};
```
