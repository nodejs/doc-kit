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

CLI tool to generate API documentation

Options:
  --log-level <level>                  Log level (choices: "debug", "info",
                                       "warn", "error", "fatal", default:
                                       "info")
  -h, --help                           display help for command

Commands:
  bootstrap [options] [generators...]  Set up a project for doc-kit: a
                                       configuration file wired to your
                                       package.json, a documentation directory,
                                       and the generator packages
  generate [options]                   Generate API docs
  install [options] [generators...]    Install the packages providing built-in
                                       generators (defaults to the targets in
                                       your configuration file)
  serve [options]                      Generate API docs, serve them locally,
                                       and regenerate on changes
  help [command]                       display help for command
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
                               sitemap, html) or an import specifier for a
                               custom generator
  --ignore <patterns...>       Ignore file patterns (glob)
  -o, --output <directory>     The output directory
  -p, --threads <number>       Number of threads to use (minimum: 1)
  --chunk-size <number>        Number of items to process per worker thread
                               (minimum: 1)
  -v, --version <semver>       Target project version
  -c, --changelog <url>        Changelog URL or path
  --git-ref <ref>              Git ref
  --index <url>                index.md URL or path
  --minify                     Minify?
  --type-map <url>             Type map URL or path
  -h, --help                   display help for command
```

### `serve`

Generates the documentation, serves it locally, and regenerates whenever the
input files change — the fastest way to preview docs while writing them. It
accepts the same configuration options as `generate`, plus:

```
Options:
  --port <number>              Preferred port (falls back to the next available
                               one) (default: 3000)
  --static                     Serve the existing output as-is, without
                               generating or watching
```

### `bootstrap`

Sets a project up end to end: a `doc-kit.config.mjs` wired to your
`package.json`, a documentation directory (detected, or created with a starter
page), a `.gitignore` entry for the output, and the generator packages
installed. Prompts for its few decisions on a TTY; `--yes` accepts the
defaults. A new project only needs:

```sh
npx doc-kit bootstrap && npx doc-kit serve
```

```
Usage: @nodejs/doc-kit bootstrap [options] [generators...]

Set up a project for doc-kit: a configuration file wired to your package.json, a
documentation directory, and the generator packages

Arguments:
  generators                Built-in generator names (json-simple, legacy-html,
                            legacy-html-all, man-page, legacy-json,
                            legacy-json-all, addon-verify, api-links, orama-db,
                            llms-txt, sitemap, html)

Options:
  -y, --yes                 Accept all defaults without prompting
  --dir <path>              The documentation directory
  -o, --output <directory>  The output directory (default: "out")
  --force                   Overwrite an existing configuration file
  -h, --help                display help for command
```

### `install`

Installs the packages providing built-in generators (e.g. `doc-kit install html`
installs `@nodejs/doc-kit-generator-react`). Without arguments, it installs
whatever the `target` in your configuration file needs. The package manager is
detected from the project lockfile.

```
Usage: @nodejs/doc-kit install [options] [generators...]

Install the packages providing built-in generators (defaults to the targets in
your configuration file)

Arguments:
  generators            Built-in generator names (json-simple, legacy-html,
                        legacy-html-all, man-page, legacy-json, legacy-json-all,
                        addon-verify, api-links, orama-db, llms-txt, sitemap,
                        html)

Options:
  --config-file <path>  Config file
  -h, --help            display help for command
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
