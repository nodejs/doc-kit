<p align="center">
  <br />
  <a href="https://nodejs.org">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://nodejs.org/static/logos/nodejsLight.svg">
      <img src="https://nodejs.org/static/logos/nodejsDark.svg" width="200px" alt="Node.js Logo">
    </picture>
  </a>
</p>

<p align="center">
  <code>@nodejs/doc-kit</code> is a tool to generate API documentation of Node.js. <a href="https://github.com/nodejs/node/issues/52343">See this issue</a> for more information.
</p>

<p align="center">
  <code>doc-kit</code> can make sites unrelated to Node.js too. <a href="https://doc-kit.nodejs.org/">View the docs, getting-started, and showcase.</a>
</p>

<p align="center">
  <a title="MIT License" href="LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  </a>
  <a href="https://codecov.io/gh/nodejs/doc-kit" >
    <img src="https://codecov.io/gh/nodejs/doc-kit/graph/badge.svg?token=TZRUKKDICU" alt="Codecov coverage badge"/>
  </a>
  <a title="scorecard" href="https://securityscorecards.dev/viewer/?uri=github.com/nodejs/doc-kit">
    <img src="https://api.securityscorecards.dev/projects/github.com/nodejs/doc-kit/badge" alt="doc-kit scorecard badge" />
  </a>
  <a href="https://www.bestpractices.dev/projects/29">
    <img src="https://www.bestpractices.dev/projects/29/badge" alt="CII Best Practices badge">
  </a>
</p>

## Usage

Local invocation:

```sh
$ npx doc-kit --help
```

```sh
$ node packages/core/bin/cli.mjs --help
```

```
Usage: @nodejs/doc-kit [options] [command]

CLI tool to generate the Node.js API documentation

Options:
  --log-level <level>  Log level (choices: "debug", "info", "warn", "error",
                       "fatal", default: "info")
  -h, --help           display help for command

Commands:
  generate [options]   Generate API docs
  help [command]       display help for command
```

### `generate`

You must provide an input and at least one target through command-line options
or a configuration file. Configuration is discovered automatically using
`cosmiconfig`, or you can select a file explicitly with `--config-file`.
Running `generate` without the required values exits with an error pointing you
to the help output.

```
Usage: @nodejs/doc-kit generate [options]

Generate API docs

Options:
  --config-file <path>         Config file
  -i, --input <patterns...>    Input file patterns (glob)
  -t, --target <generator...>  Target generator(s): a built-in name
                               (json-simple, legacy-html, legacy-html-all,
                               man-page, legacy-json, legacy-json-all,
                               addon-verify, api-links, orama-db, llms-txt,
                               sitemap, web) or an import specifier for a custom
                               generator
  --ignore <patterns...>       Ignore file patterns (glob)
  -o, --output <directory>     The output directory
  -p, --threads <number>       Number of threads to use (minimum: 1)
  --chunk-size <number>        Number of items to process per worker thread
                               (minimum: 1)
  -v, --version <semver>       Target Node.js version
  -c, --changelog <url>        Changelog URL or path
  --git-ref <ref>              Git ref
  --index <url>                index.md URL or path
  --minify                     Minify?
  --type-map <url>             Type map URL or path
  -h, --help                   display help for command
```

### `serve`

`serve` accepts the same options as `generate`, plus a `--port`. It generates
the documentation, serves the output on <http://localhost:3000> (or the next
available port), and regenerates whenever the input files change — ideal while
writing documentation.

```sh
npx doc-kit serve -t html -i "docs/*.md" -o out
```

To serve an already-generated output directory without regenerating or
watching, pass `--static`:

```sh
npx doc-kit serve --static -o out
```

## Examples

### Legacy

To generate a 1:1 match with the [legacy tooling](https://github.com/nodejs/node/tree/main/tools/doc), use the `legacy-html`, `legacy-json`, `legacy-html-all`, and `legacy-json-all` generators.

```sh
npx doc-kit generate \
  -t legacy-html \
  -t legacy-json \
  -i "path/to/node/doc/api/*.md" \
  -o out \
  --index path/to/node/doc/api/index.md
```

### Redesigned

To generate [our redesigned documentation pages](https://nodejs-api-docs-tooling.vercel.app), use the `html` and `orama-db` (for search) generators. These generators live in the separate [`@nodejs/doc-kit-generator-react`](packages/react) package, which must be installed alongside this one.

```sh
npx doc-kit generate \
  -t html \
  -t orama-db \
  -i "path/to/node/doc/api/*.md" \
  -o out \
  --index path/to/node/doc/api/index.md
```

> [!TIP]
> In order to use the search functionality, you _must_ serve the output directory.
>
> ```sh
> npx doc-kit serve --static -o out
> ```
