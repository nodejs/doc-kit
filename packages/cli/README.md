# `@doc-kit/cli`

The command-line interface for [doc-kit](https://github.com/nodejs/doc-kit):
the `doc-kit` binary that runs the
[`@doc-kit/core`](https://www.npmjs.com/package/@doc-kit/core) engine to turn
API-shaped Markdown into documentation sites, JSON, man pages, and more.

## Usage

```sh
npx @doc-kit/cli --help
npx @doc-kit/cli generate --help
```

You must provide an input and at least one target through command-line
options or a configuration file. Configuration is discovered automatically
using `cosmiconfig`, or you can select a file explicitly with
`--config-file`.

```sh
npx @doc-kit/cli generate \
  -t html \
  -i "path/to/docs/**/*.md" \
  -o out
```

Built-in generator names resolve to the [`@doc-kit/core`
generators](https://www.npmjs.com/package/@doc-kit/core) and its companion
generator packages, which must be installed alongside this one. Custom
generators load by import specifier — any module whose default export is a
generator works as a `--target`.

## Contributing

This package lives in the [nodejs/doc-kit](https://github.com/nodejs/doc-kit)
monorepo. From this directory (or the repository root with
`npm run <script> --workspace @doc-kit/cli`):

```sh
# Run the CLI
npm run run -- generate --help

# Re-run the CLI on every change
npm run watch
```
