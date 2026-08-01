# Configuration

`doc-kit` uses [`cosmiconfig`](https://github.com/cosmiconfig/cosmiconfig) to
discover and load configuration. Run the CLI from your project directory and it
will automatically look for a `doc-kit` property in `package.json`, rc files
such as `.doc-kitrc.yml`, and module files such as `doc-kit.config.mjs`.

Use `--config-file <path>` to load a specific file instead of searching.

## Configuration File Format

Configuration files can be either:

- **JavaScript** (`.js`, `.mjs`, `.cjs`)
- **TypeScript** (`.ts`, when `typescript` is installed in the project)
- **JSON** (`.json`)
- **YAML** (`.yaml`, `.yml`, or an extensionless rc file)

JavaScript and TypeScript configuration files export the configuration object.
JSON and YAML files contain the object directly. A `package.json` configuration
uses the `doc-kit` property:

```json
{
  "doc-kit": {
    "target": ["json"],
    "global": {
      "input": "doc/api/*.md",
      "output": "out"
    }
  }
}
```

### Basic Example

```javascript
export default {
  // Targets, alternatively supplied by command line flags. Each entry is
  // either a built-in shorthand name or an import specifier resolving to a
  // generator module (e.g. '@my-scope/my-package/my-generator').
  target: ['orama-db', 'web'],
  global: {
    version: '20.0.0',
    minify: true,
    repository: 'nodejs/node',
    ref: 'main',
    baseURL: 'https://nodejs.org/docs/',
    input: 'src/',
    output: 'dist/',
    ignore: ['node_modules/', 'test/'],
    changelog:
      'https://raw.githubusercontent.com/nodejs/node/main/CHANGELOG.md',
    index:
      'https://raw.githubusercontent.com/nodejs/node/main/doc/api/index.md',
  },

  threads: 4,
  chunkSize: 10,

  // Generator-specific configurations
  json: {
    format: 'json',
    minify: false, // Override global setting
  },

  html: {
    format: 'html',
  },

  metadata: {
    typeMap: {
      String: 'string',
      Number: 'number',
      Boolean: 'boolean',
    },
  },
};
```

## Configuration Structure

### Global Configuration

The `global` object contains settings that apply to all generators unless overridden:

| Property     | Type               | Description                                | Default                                            |
| ------------ | ------------------ | ------------------------------------------ | -------------------------------------------------- |
| `version`    | `string \| SemVer` | Documentation version                      | `process.version`                                  |
| `minify`     | `boolean`          | Whether to minify output                   | `true`                                             |
| `repository` | `string`           | GitHub repository in `owner/repo` format   | `'nodejs/node'`                                    |
| `ref`        | `string`           | Git reference (branch, tag, or commit SHA) | `'HEAD'`                                           |
| `baseURL`    | `string \| URL`    | Base URL for documentation                 | `'https://nodejs.org/docs'`                        |
| `input`      | `string[]`         | Input directory path                       | -                                                  |
| `output`     | `string`           | Output directory path                      | -                                                  |
| `ignore`     | `string[]`         | Patterns to ignore                         | `[]`                                               |
| `changelog`  | `string \| URL`    | Changelog URL                              | Auto-generated URL based on `ref` and `repository` |
| `index`      | `string \| URL`    | Index URL                                  | -                                                  |

### Generator-Specific Configuration

Each generator (e.g., `json`, `html`, `markdown`) can have its own configuration that overrides global settings:

```javascript
export default {
  global: {
    version: '20.0.0',
    minify: true,
  },

  'legacy-json': {
    minify: false, // Override: JSON output won't be minified
  },
};
```

## Configuration Merging

Configurations are merged in the following order (higher sources take
precedence):

1. **CLI options** (command-line arguments)
2. **Configuration file** (discovered or selected with `--config-file`)
3. **Default values** (built-in defaults)

## CLI Options Mapping

CLI options map to configuration properties:

| CLI Option             | Config Property    | Example                   |
| ---------------------- | ------------------ | ------------------------- |
| `--input <path>`       | `global.input`     | `--input src/`            |
| `--output <path>`      | `global.output`    | `--output dist/`          |
| `--ignore <pattern>`   | `global.ignore[]`  | `--ignore test/`          |
| `--minify`             | `global.minify`    | `--minify`                |
| `--git-ref <ref>`      | `global.ref`       | `--git-ref v20.0.0`       |
| `--version <version>`  | `global.version`   | `--version 20.0.0`        |
| `--changelog <url>`    | `global.changelog` | `--changelog https://...` |
| `--index <url>`        | `global.index`     | `--index file://...`      |
| `--type-map <map>`     | `metadata.typeMap` | `--type-map file://...`   |
| `--target <generator>` | `target`           | `--target json`           |
| `--threads <n>`        | `threads`          | `--threads 4`             |
| `--chunk-size <n>`     | `chunkSize`        | `--chunk-size 10`         |
