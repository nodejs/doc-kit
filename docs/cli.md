# CLI

The `doc-kit` command-line interface. Every option that maps to
configuration can also live in a [configuration file](./configuration.md);
when both are present, CLI flags win (rule of specifity).

```sh
npx doc-kit [command] [options]
```

One option applies to every command:

| Option                | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `--log-level <level>` | `debug`, `info` (default), `warn`, `error`, or `fatal` |

## `doc-kit bootstrap`

```sh
npx doc-kit bootstrap [options] [generators...]
```

Sets a project up end to end: a `doc-kit.config.mjs` wired to your
`package.json`, a documentation directory (detected, or created with a
starter page), a `.gitignore` entry for the output, and the generator
packages installed. On a terminal it prompts for its few decisions;
otherwise (or with `--yes`) it accepts the defaults.

| Option                 | Description                                   |
| ---------------------- | --------------------------------------------- |
| `[generators...]`      | Built-in generator names. **Default:** `html` |
| `-y`, `--yes`          | Accept all defaults without prompting         |
| `--dir <path>`         | The documentation directory                   |
| `-o`, `--output <dir>` | The output directory. **Default:** `out`      |
| `--force`              | Overwrite an existing configuration file      |

## `doc-kit generate`

```sh
npx doc-kit generate [options]
```

Runs the generators and writes their output. Requires a `target` and an
`input`, from flags or the configuration file.

| Option                        | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| `--config-file <path>`        | Use a specific configuration file instead of searching        |
| `-i`, `--input <patterns...>` | Input file patterns (glob)                                    |
| `-t`, `--target <name...>`    | Generator name(s), or import specifiers for custom generators |
| `--ignore <patterns...>`      | Input patterns to skip                                        |
| `-o`, `--output <dir>`        | The output directory                                          |
| `-v`, `--version <semver>`    | The version of the project being documented                   |
| `-c`, `--changelog <url>`     | Changelog URL or path (release history for version selectors) |
| `--git-ref <ref>`             | Git ref used in source links                                  |
| `--index <url>`               | `index.md` URL or path                                        |
| `--minify`                    | Minify the output                                             |
| `--type-map <url>`            | Type map URL or path (custom type-name → URL links)           |
| `-p`, `--threads <n>`         | Worker threads to use (minimum 1)                             |
| `--chunk-size <n>`            | Items per worker thread (minimum 1)                           |

## `doc-kit serve`

```sh
npx doc-kit serve [options]
```

Generates the documentation, serves it locally, and regenerates whenever
input files change — the writing loop. Accepts every `generate` option,
plus:

| Option            | Description                                                            |
| ----------------- | ---------------------------------------------------------------------- |
| `--port <number>` | Preferred port, falling back to the next free one. **Default:** `3000` |
| `--static`        | Serve the existing output as-is, without generating or watching        |

`--static` is also the production preview: it serves any built output
directory over HTTP, which the `html` output requires.

## `doc-kit install`

```sh
npx doc-kit install [generators...]
```

Installs the packages providing built-in generators — `doc-kit install html`
installs `@nodejs/doc-kit-generator-react`. With no arguments, it installs
whatever the `target` in your configuration file needs. The package manager
is detected from your lockfile (npm, pnpm, yarn, or bun).

| Option                 | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `[generators...]`      | Built-in generator names                               |
| `--config-file <path>` | Use a specific configuration file instead of searching |
