# `@doc-kit/cli`

The command-line interface of [doc-kit](https://doc-kit.nodejs.org), the
Node.js project's toolkit for API documentation. Its `doc-kit` command reads
your docs and runs generators that write a website, the search index, JSON,
`llms.txt`, man pages, or whatever a custom generator produces. Use it to
build your docs locally and in CI.

## Install

```bash
npm install --save-dev @doc-kit/cli @doc-kit/generator-react
```

The CLI comes with [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core)
and its JSON generators. The other generators live in their own packages,
which you install next to the CLI. The command above adds the website
generators; leave `@doc-kit/generator-react` out if you only need JSON.

| Package                                                                 | Generators                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core)             | `json`, `json-all`, `json-simple`                                           |
| [`@doc-kit/generator-react`](https://doc-kit.nodejs.org/packages/react) | `html`, `section-pages`, `orama-db`, `sitemap`, `llms-txt`, `llms-txt-full` |
| [`@node-core/doc-kit`](https://doc-kit.nodejs.org/packages/node)        | `man-page`, `api-links`, `addon-verify`                                     |

## Build your docs

```bash
npx doc-kit generate -t html -t orama-db -i "docs/**/*.md" -o out
```

This builds the website and its search index from every Markdown file under
`docs/`, and writes them to `out/`. A run needs at least a target and an
input, from flags or a [configuration file](#configuration):

- `-t, --target <generator...>` {string[]} The generators to run. Repeat the
  flag, or list several names after it.
- `-i, --input <patterns...>` {string[]} Glob patterns matching your source
  files. Quote them, so your shell passes them on unexpanded.
- `-o, --output <directory>` {string} The directory the generators write to.

Run `npx doc-kit generate --help`, or see the
[CLI reference](https://doc-kit.nodejs.org/cli), for every option.

## Preview the output

```bash
npx doc-kit preview
```

This serves `./out` on <http://localhost:3000> as it is, without reading your
configuration file. Pass it any `generate` option and it builds first, then
serves the directory that build wrote to. If your build writes somewhere other
than `./out`, pass your configuration file (or `-o`) so it builds and serves
that directory:

```bash
npx doc-kit preview --config-file doc-kit.config.mjs
```

It builds once and doesn't watch for changes, so run it again after editing.
Two options of its own control the server:

- `--port <number>` {number} The port to serve on. **Default:** `3000`.
- `--host <host>` {string} The host to listen on. **Default:** `'localhost'`.

> [!NOTE]
> The preview server is meant for checking your docs locally. To put them
> online, upload the output directory to a static host; see
> [Publishing your docs](https://doc-kit.nodejs.org/publishing).

## Configuration

Instead of passing flags on every run, put your options in a configuration
file:

```mjs displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'orama-db'],

  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
};
```

With this file in place, `npx doc-kit generate` needs no flags. doc-kit looks
for it in the working directory, as `doc-kit.config.mjs` (or `.js`, `.cjs`),
a `.doc-kitrc` file in JSON, YAML or JavaScript, or a `doc-kit` key in
`package.json`. Pass `--config-file <path>` to load another file. A flag wins
over the file when both set the same option.

The [configuration reference](https://doc-kit.nodejs.org/configuration)
covers every option, including each generator's own.

## Custom generators

`--target`, and `target` in the configuration file, also take a generator you
wrote or installed: a relative path such as `./my-generator.mjs` (resolved
from the working directory), an absolute path, or a package name. The
module's default export must have a `name` and a `generate` function.

```bash
npx doc-kit generate -t ./my-generator.mjs -i "docs/**/*.md" -o out
```

[Creating generators](https://doc-kit.nodejs.org/creating-generators) shows
how to write one.

## Log level

`--log-level <level>` works with every command. It takes `debug`, `info`,
`warn`, `error` or `fatal`, and defaults to `info`:

```bash
npx doc-kit --log-level debug generate
```

## Documentation

- [Getting started](https://doc-kit.nodejs.org/getting-started): from an empty
  folder to a site with search.
- [CLI](https://doc-kit.nodejs.org/cli): every command and option.
- [Configuration](https://doc-kit.nodejs.org/configuration): the
  configuration file and how it merges with flags.
- [Generators](https://doc-kit.nodejs.org/generators): what each generator
  writes.

To verify the output locally, `preview` serves it over HTTP — the built-in
server is meant for local testing only and is not production grade. Passing
any `generate` option builds first; otherwise the existing output directory
(`./out` by default) is served as-is.

```sh
npx @doc-kit/cli preview --host localhost --port 3000
```

## Contributing

This package lives in `packages/cli` of the
[nodejs/doc-kit](https://github.com/nodejs/doc-kit) monorepo, which uses
Node.js 24 and pnpm:

```bash
git clone https://github.com/nodejs/doc-kit.git
cd doc-kit
pnpm install

# Run the CLI from source
node --run run -- generate --help

# Run it again whenever a file it imports changes
node --run watch -- generate -t json -i "path/to/docs/**/*.md" -o out
```

Each command is a module in `bin/commands/`;
[Adding a command](https://doc-kit.nodejs.org/contributing/commands) walks
through writing one. Run the tests with `node --run test`, and add a changeset
with `node --run changeset` for any change users will notice. The
[contributing guide](https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md)
has the rest.
