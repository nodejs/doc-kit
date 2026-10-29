# `@doc-kit/cli`

The command-line interface of [doc-kit](https://doc-kit.nodejs.org), the
Node.js project's toolkit for API documentation. Its `doc-kit` command reads
your docs and runs generators that write a website, the search index, JSON,
`llms.txt`, man pages, or whatever a custom generator produces. Use it to
build your docs locally and in CI.

## Install

```bash
npm install --save-dev @doc-kit/cli
```

Generator packages are installed separately; see
[Generators](https://doc-kit.nodejs.org/generators) for the package each
generator comes from.

## Build your docs

```bash
npx @doc-kit/cli generate \
  -t html \
  -i "path/to/docs/**/*.md" \
  -o out
```

A run needs at least a target and an input, from flags or a
[configuration file](#configuration). Run `npx @doc-kit/cli generate --help`,
or see the [CLI reference](https://doc-kit.nodejs.org/cli), for every option.

## Preview the output

To verify the output locally, `preview` serves it over HTTP. Passing any
`generate` option builds first; otherwise the existing output directory
(`./out` by default) is served as-is, without reading your configuration file.

```bash
npx @doc-kit/cli preview --host localhost --port 3000
```

If your build writes somewhere other than `./out`, pass your configuration file
(or `-o`) so it builds and serves that directory:

```bash
npx @doc-kit/cli preview --config-file doc-kit.config.mjs
```

It builds once and doesn't watch for changes, so run it again after editing.

> [!WARNING]
> The preview server is not meant to be a secure server. Use it for local
> testing only, and don't expose it to a network. To put your docs online, see
> [Publishing your docs](https://doc-kit.nodejs.org/publishing).

## Configuration

Instead of passing flags on every run, put your options in a
[configuration file](https://doc-kit.nodejs.org/configuration). doc-kit looks
for one in the working directory, or loads the file you pass with
`--config-file <path>`. A flag wins over the file when both set the same
option.

## Custom generators

`--target`, and `target` in the configuration file, also take a generator you
wrote or installed: a relative path such as `./my-generator.mjs` (resolved
from the working directory), an absolute path, or a package name. The
module's default export must have a `name` and a `generate` function.

```bash
npx @doc-kit/cli generate -t ./my-generator.mjs -i "docs/**/*.md" -o out
```

[Creating generators](https://doc-kit.nodejs.org/creating-generators) shows
how to write one.

## Contributing

This package lives in `packages/cli` of the
[nodejs/doc-kit](https://github.com/nodejs/doc-kit) monorepo, which uses
pnpm. From the repository root:

```bash
pnpm install

# Run the CLI from source
pnpm run run generate --help

# Re-run it on every change
pnpm run watch generate -t json -i "path/to/docs/**/*.md" -o out
```

Each command is a module in `bin/commands/`;
[Adding a command](https://doc-kit.nodejs.org/contributing/commands) walks
through writing one. Run the tests with `pnpm test`, and add a changeset with
`pnpm changeset` for any change users will notice. The
[contributing guide](https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md)
has the rest.
