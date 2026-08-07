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
