# CLI

The `doc-kit` command builds your docs with `doc-kit generate` and serves
them locally with `doc-kit preview`. It comes from the
[`@doc-kit/cli`](./packages/cli.md) package; install it in your project as
shown in [Getting started](./getting-started.md), then run it with `npx`:

```bash
npx @doc-kit/cli [command] [options]
```

`npx @doc-kit/cli --help` lists the commands, and
`npx @doc-kit/cli generate --help` the options of one.

## `doc-kit generate`

Runs the generators and writes their output. It needs at least one target
and an input, from flags or a [configuration file](#configuration-files):

```bash
npx @doc-kit/cli generate -t html -t orama-db -i "docs/**/*.md" -o out
```

Quote glob patterns, so they reach doc-kit as written instead of being
expanded by your shell. Options that take a list accept several values after
one flag (`-t html orama-db`) or the flag repeated (`-t html -t orama-db`).
Each option except `--config-file` sets the configuration key named in
parentheses.

- `-t, --target <name...>` {string[]} Generators to run (`target`): built-in
  names, such as `html` or `orama-db`, or the import specifier or path of a
  [custom generator](./creating-generators.md). The
  [generators overview](./generators.md) lists the built-in ones and the
  package each comes from.
- `-i, --input <patterns...>` {string[]} Glob patterns of the files to read
  (`global.input`).
- `--ignore <patterns...>` {string[]} Glob patterns of files to leave out
  (`global.ignore`).
- `-o, --output <dir>` {string} Directory to write the output to
  (`global.output`).
- `--config-file <path>` {string} Path of the configuration file to load,
  instead of searching the working directory for one.
- `-v, --version <semver>` {string} Version of the project being documented
  (`global.version`), coerced to semver, so `22` means `22.0.0`.
  **Default:** the version of Node.js running doc-kit.
- `-c, --changelog <url>` {string} URL or path of a changelog in the format of
  Node.js's `CHANGELOG.md`, which the version selector is built from
  (`global.changelog`). Without one, the output covers a single version.
- `--index <url>` {string} URL or path of an `index.md` whose list of links
  (`* [Title](file.md)`) sets the order of the documents in the JSON bundle,
  the legacy HTML sidebar and the legacy JSON bundle (`global.index`).
- `--git-ref <ref>` {string} Git branch, tag, or commit that links into your
  repository point to, such as edit links and the JSON output's source URLs
  (`global.ref`). The website's source code links follow
  [`jsx-ast.ref`](./generators/jsx-ast.md#configuring) instead, which defaults
  to `'main'` and is set in a configuration file. **Default:** `'HEAD'`.
- `--type-map <url>` {string} URL or path of a JSON file mapping type names to
  the URLs documenting them, used to link types (`metadata.typeMap`).
- `--minify` {boolean} Minify the output (`global.minify`). **Default:**
  `false`.
- `-p, --threads <n>` {number} Worker threads to use, at least 1 (`threads`).
  **Default:** the number of CPUs, up to 4.
- `--chunk-size <n>` {number} Items each worker processes per task, at least 1
  (`chunkSize`). **Default:** `10`.

```bash
# Build everything the configuration file describes
npx @doc-kit/cli generate

# Build only the JSON output, minified, into dist/json
npx @doc-kit/cli generate -t json -o dist/json --minify
```

When something fails, doc-kit logs the error and exits with code 1, so a
broken build also fails your CI job.

## `doc-kit preview`

Serves the output directory over HTTP at <http://localhost:3000>, so you can
check a build in the browser the way a host would serve it:

```bash
npx @doc-kit/cli preview [options]
```

What it serves depends on the options you pass:

- **No `generate` options:** it serves `./out` as it is, without reading your
  configuration file, and stops with an error if `./out` doesn't exist.
- **Any `generate` option:** it builds first, exactly as `doc-kit generate`
  would, then serves the directory that build wrote to. To build from your
  configuration file alone, pass it with `--config-file`.

It builds once and doesn't watch for changes, so run it again after editing.
Directories serve their `index.html`, and paths that don't exist get the
output's `404.html`, when it has one.

It takes these options, plus every option of
[`doc-kit generate`](#doc-kit-generate):

- `--port <n>` {number} Port to serve on; `0` picks a free one. **Default:**
  `3000`.
- `--host <host>` {string} Host to listen on. **Default:** `'localhost'`.

```bash
# Build with the configuration file, then serve its output directory
npx @doc-kit/cli preview --config-file doc-kit.config.mjs

# Build only the site, then serve it on another port
npx @doc-kit/cli preview -t html --port 8080
```

> [!WARNING]
> The preview server is meant for local testing only. It is not a secure,
> production-grade server: don't expose it to other machines, and don't use
> it to deploy your documentation. To publish, see
> [Publishing your docs](./publishing.md).

## Global options

These work with every command, before or after its name:

- `--log-level <level>` {string} Log only messages at this level or above:
  `debug`, `info`, `warn`, `error`, or `fatal`. **Default:** `'info'`.

```bash
npx @doc-kit/cli generate --log-level debug
```

## Configuration files

Everything the `generate` flags set can also live in a
[configuration file](./configuration.md), along with what they don't cover,
such as generator options, Markdown plugins, and presets. Flags win over the
file; see [Precedence](./configuration.md#precedence).
