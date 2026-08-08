# CLI

The `doc-kit` command-line interface. Every option that maps to
configuration can also live in a [configuration file](./configuration.md);
when both are present, CLI flags win (rule of specifity).

```bash
npx @doc-kit/cli [command] [options]
```

One option applies to every command:

- `--log-level <level>` {string} `debug`, `info`, `warn`, `error`, or
  `fatal`. **Default:** `'info'`.

## `doc-kit generate`

```bash
npx @doc-kit/cli generate [options]
```

Runs the generators and writes their output. Requires a `target` and an
`input`, from flags or the configuration file.

- `--config-file <path>` {string} Use a specific configuration file instead
  of searching.
- `-i, --input <patterns...>` {string[]} Input file patterns (glob).
- `-t, --target <name...>` {string[]} Generator name(s), or import
  specifiers for custom generators.
- `--ignore <patterns...>` {string[]} Input patterns to skip.
- `-o, --output <dir>` {string} The output directory.
- `-v, --version <semver>` {string} The version of the project being
  documented.
- `-c, --changelog <url>` {string} Changelog URL or path (release history
  for version selectors).
- `--git-ref <ref>` {string} Git ref used in source links.
- `--index <url>` {string} `index.md` URL or path.
- `--minify` {boolean} Minify the output.
- `--type-map <url>` {string} Type map URL or path (custom type-name → URL
  links).
- `-p, --threads <n>` {number} Worker threads to use (minimum 1).
- `--chunk-size <n>` {number} Items per worker thread (minimum 1).
