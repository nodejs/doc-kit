# `@doc-kit/core`

The engine of [doc-kit](https://doc-kit.nodejs.org). It loads your
configuration, runs generators in dependency order across worker threads, and
provides the JSON generators and the parsing stages that every output builds
on.

You usually reach it through the
[`doc-kit` CLI](https://doc-kit.nodejs.org/packages/cli), which depends on it.
Import it yourself to [run doc-kit from a script](#running-it-from-code) or to
[write a generator](#writing-a-generator).

## Install

```sh
npm install --save-dev @doc-kit/cli
```

Installing the CLI installs this package, and with it the JSON generators.
This command writes one JSON document per Markdown file to `out/`:

```sh
npx @doc-kit/cli generate -t json -i "docs/**/*.md" -o out
```

To import `@doc-kit/core` from your own code, add it to your own dependencies
too. Package managers that don't hoist dependencies, such as pnpm, won't let
you import it otherwise:

```sh
npm install --save-dev @doc-kit/core
```

## How it runs

Every output comes from a generator, and each generator names the one it reads
from with `dependsOn`. On every run, doc-kit:

1. Merges the configuration: command-line options override the configuration
   file, which overrides the defaults.
2. Resolves each target: a built-in name such as `json` to the package that
   provides it, a path to that file, and anything else to a package import.
3. Loads the targets and every generator they depend on, and runs each one
   once, as soon as its input is ready. Your sources are parsed once, however
   many outputs read them, and independent generators run at the same time.
4. Splits per-file work into chunks of `chunkSize` items across up to
   `threads` worker threads, and frees each result once the last generator
   reading it has it.

## Generators

This package provides the JSON targets:

| Target        | Writes                                                        | Reference                                                       |
| ------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `json`        | One JSON document per source file, described by a JSON schema | [JSON](https://doc-kit.nodejs.org/generators/json)              |
| `json-all`    | Every `json` document, bundled in one `all.json`              | [JSON bundle](https://doc-kit.nodejs.org/generators/json-all)   |
| `json-simple` | The API entries in one `api-docs.json`, for debugging doc-kit | [Debug JSON](https://doc-kit.nodejs.org/generators/json-simple) |

It also provides the pipeline stages. They write nothing, and run whenever a
generator you ask for depends on them:

| Stage      | What it does                                                           | Reference                                                          |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `ast`      | Parses the Markdown and MDX files matched by `input` into syntax trees | [Parsing Markdown](https://doc-kit.nodejs.org/generators/ast)      |
| `metadata` | Turns those trees into typed API entries, which most generators read   | [API entries](https://doc-kit.nodejs.org/generators/metadata)      |
| `ast-js`   | Parses the `.js` files matched by `input`, for `api-links`             | [Parsing JavaScript](https://doc-kit.nodejs.org/generators/ast-js) |

The other generators come from companion packages; the
[generators overview](https://doc-kit.nodejs.org/generators) lists which
package provides each.

## Configuration

This package finds the configuration file, merges it with the command-line
options and the defaults, and hands each generator its options.
[Configuration](https://doc-kit.nodejs.org/configuration) covers
[targets](https://doc-kit.nodejs.org/configuration#targets),
[execution options](https://doc-kit.nodejs.org/configuration#execution-options)
and [extending presets](https://doc-kit.nodejs.org/configuration#extending-presets).

## Running it from code

The CLI's `generate` command comes down to two calls, which you can make
yourself:

```js displayName="build-docs.mjs"
import createGenerator from '@doc-kit/core';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';

// The options of `doc-kit generate`, in camelCase. The configuration file is
// found and merged as on the command line.
const config = await setConfig({
  input: ['docs/**/*.md'],
  target: ['json', 'json-all'],
  output: 'out',
});

const { runGenerators } = createGenerator();

// One result per target, in the order given
const [documents, bundle] = await runGenerators(config);
```

`setConfig()` takes the options of `doc-kit generate`: `input`, `target`,
`output`, `ignore`, `threads`, `chunkSize`, `version`, `changelog`, `gitRef`,
`index`, `minify`, `typeMap` and `configFile`. It ignores anything else, so
options such as `project`, `repository` or a generator's own section go in the
configuration file. It also stores the configuration generators read with
`getConfig()`, so a process runs one configuration at a time.

Without an `output`, the JSON generators write nothing and only return their
results.

## Writing a generator

A generator is a module whose default export describes it, passed to the CLI
by its path (`-t ./my-generator.mjs`).
[Creating generators](https://doc-kit.nodejs.org/creating-generators) walks
through writing one and each key of its default export, with worker threads,
streaming and dependents.

## Exports

| Import                                        | Provides                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `@doc-kit/core`                               | `createGenerator()`, the default export, which returns `{ runGenerators }`                                   |
| `@doc-kit/core/<name>`                        | Each generator and stage above (`json`, `metadata`, …) as the default export, for a generator's `dependsOn`  |
| `@doc-kit/core/utils/configuration/index.mjs` | `setConfig(options)`, and `getConfig(name)`, the default export: a generator's options, merged with `global` |
| `@doc-kit/core/utils/file.mjs`                | `writeFile()` and `writeJSON()`, which create missing directories                                            |
| `@doc-kit/core/utils/markdown/processor.mjs`  | `getProcessor(name)`: the unified processor of a generator's `markdown`                                      |
| `@doc-kit/core/plugins/shiki/highlighter.mjs` | `getHighlighter(name)`: the code highlighter of a generator's `markdown`                                     |
| `@doc-kit/core/logger/index.mjs`              | The logger, with `logger.child(name)` for one of your own                                                    |
| `@doc-kit/core/generators/types`              | The generator types, such as `GeneratorMetadata` and `ParallelWorker`, declared as globals                   |

## Contributing

This package lives in the [nodejs/doc-kit](https://github.com/nodejs/doc-kit)
monorepo. Set it up as the
[contributing guide](https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md)
describes, then, from this directory:

```sh
# Run this package's tests
pnpm test

# Re-run the tests on every change
pnpm run test:watch
```
