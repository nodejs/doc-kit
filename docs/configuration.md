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

```json displayName="package.json"
{
  "doc-kit": {
    "target": ["json-simple"],
    "global": {
      "input": "doc/api/*.md",
      "output": "out"
    }
  }
}
```

### Basic Example

```mjs displayName="doc-kit.config.mjs"
export default {
  // Targets, alternatively supplied by command line flags. Each entry is
  // either a built-in shorthand name or an import specifier resolving to a
  // generator module (e.g. '@my-scope/my-package/my-generator').
  target: ['orama-db', 'html'],
  global: {
    project: 'My Project',
    version: '1.2.0',
    input: 'docs/**/*.md',
    output: 'dist/',
    ignore: ['node_modules/', 'test/'],
    baseURL: 'https://example.com/docs/',
  },

  threads: 4,
  chunkSize: 10,

  // Generator-specific configurations
  html: {
    title: '{project} Documentation',
  },

  metadata: {
    typeMap: {
      MyThing: 'https://example.com/docs/my-thing.html',
    },
  },
};
```

## Extending Presets

A configuration file may declare `extends`: one or more presets whose values
are merged underneath its own. Each entry is either an import specifier of a
module whose default export is a configuration object, or a path relative to
the configuration file:

```mjs displayName="doc-kit.config.mjs"
export default {
  // Build the docs the way nodejs.org does — branding, URL layouts,
  // and release history included
  extends: '@node-core/doc-kit/config',

  html: {
    // Your own values still win over the preset
    title: '{project} {version} API Reference',
  },
};
```

`extends` also accepts an array; later presets take precedence over earlier
ones, and the configuration file itself wins over all of them.

The built-in defaults are deliberately project-neutral: no repository,
site URL, release history, or branding is assumed. The
[`@node-core/doc-kit/config`](https://github.com/nodejs/doc-kit/tree/main/packages/node)
preset opts back into everything Node.js-specific.

## Configuration Structure

Three sources, in order of precedence:

1. **CLI flags** (see the [CLI reference](./cli.md)) override
2. **the configuration file**, which overrides
3. **built-in defaults**.

## Global options

Everything under the `global` key applies to every generator:

- `project` {string} Name of the project being documented, used in titles,
  logos, and templated text. Defaults to the `name` in your `package.json`.
- `version` {string|SemVer} Documentation version. **Default:**
  `process.version`.
- `minify` {boolean} Whether to minify output. **Default:** `true`.
- `repository` {string} GitHub repository in `owner/repo` format; without
  one, repository UI is omitted.
- `ref` {string} Git reference (branch, tag, or commit SHA). **Default:**
  `'HEAD'`.
- `baseURL` {string|URL} Base URL of the published site, used wherever
  absolute URLs are needed.
- `input` {string[]} Input file patterns (glob).
- `output` {string} Output directory path.
- `ignore` {string[]} Patterns to ignore. **Default:** `[]`.
- `changelog` {string|URL|Array} Release history used for version selectors;
  a URL or path to parse, or a pre-parsed array. **Default:** `[]`
  (single-version output).
- `index` {string|URL|Array} Index URL.
- `markdown` {Object} [Markdown plugins](#markdown-plugins) for every
  generator processing Markdown.

A generator's own section (e.g., `html`, `legacy-json`) can override any of
these for that generator alone, except `markdown`, which it adds to.

## Execution options

Top-level, alongside `target` and `global`:

- `threads` {number} Worker threads used for generation. Defaults to your
  CPU count.
- `chunkSize` {number} Items processed per worker thread. **Default:** `10`.

## Generator options

Each generator documents its own options on its reference page — see the
[generators overview](./generators.md). Two commonly configured ones:

```mjs displayName="doc-kit.config.mjs"
export default {
  global: {
    version: '1.2.0',
    minify: true,
  },

  metadata: {
    typeMap: {
      MyThing: 'https://example.com/docs/my-thing.html',
    },
  },
};
```

## Markdown plugins

`doc-kit` processes Markdown with [unified](https://unifiedjs.com/).
`global.markdown` adds plugins to every generator processing Markdown, and a
generator's own `markdown` adds plugins to it alone, after the global ones.

```mjs displayName="doc-kit.config.mjs"
export default {
  global: {
    markdown: {
      remarkPlugins: ['remark-math'],
    },
  },

  // The generator rendering the site's pages
  'jsx-ast': {
    markdown: {
      rehypePlugins: [
        'rehype-katex',
        ['./plugins/rehype-diagrams.mjs', { theme: 'neutral' }],
      ],
    },
  },
};
```

Each plugin is a module specifier (a package name, or a path relative to the
configuration file), alone or in a `[specifier, options]` pair. The module
default-exports the plugin, a list of plugins, or a unified preset. Markdown is
processed in worker threads, which import the plugins themselves, so options
must be serializable: configure a plugin taking functions in a module of your
own.

- `remarkPlugins` {Array} The global ones run on each document once the `ast`
  generator parses it, so every output sees their changes. A generator
  rendering Markdown, such as `jsx-ast`, runs its own on what it renders.
- `rehypePlugins` {Array} Run on the HTML of the generators rendering
  Markdown, such as `jsx-ast`, before code is highlighted.
- `recmaPlugins` {Array} Run on the JavaScript `jsx-ast` compiles the pages to.

A generator only takes the plugins its pipeline has a place for: `jsx-ast`
takes all three kinds, `ast`, `metadata`, and `json` take remark plugins, and
generators such as `html` take none. Plugins listed for a generator that
doesn't take them are ignored with a warning.

A generator runs each plugin once: listing one it already has, its own or a
global one, configures it instead, merging the options (arrays add up, and
objects merge).

The plugins configured for `jsx-ast` don't apply to the fragments it renders
on their own: types, parameter descriptions, and change history notes.

### Code highlighting

`jsx-ast` highlights code with the `@doc-kit/core/plugins/shiki/rehype.mjs`
plugin, which runs [Shiki](https://shiki.style/) with every language it
bundles. To configure it, list it with options in
`jsx-ast.markdown.rehypePlugins` (with pnpm, add `@doc-kit/core` to your
dependencies, so your configuration file can resolve it):

- `langs` {Array} More languages: grammars, or modules default-exporting them.
- `langAlias` {Object} Aliases of languages, such as `{ conf: 'ini' }`.
- `themes` {Object} The `light` and `dark` themes: names of themes Shiki
  bundles, modules default-exporting themes, or themes.
- `transformers` {Array} Modules default-exporting
  [Shiki transformers](https://shiki.style/guide/transformers), or lists of
  them.

These modules are paths relative to the working directory, or URLs, such as
the ones `import.meta.resolve()` gives:

```mjs displayName="doc-kit.config.mjs"
export default {
  'jsx-ast': {
    markdown: {
      rehypePlugins: [
        [
          '@doc-kit/core/plugins/shiki/rehype.mjs',
          {
            langAlias: { conf: 'ini' },
            themes: { light: 'github-light', dark: 'github-dark' },
            transformers: [import.meta.resolve('./shiki-transformers.mjs')],
          },
        ],
      ],
    },
  },
};
```

## Configuration Merging

Configurations are merged in the following order (higher sources take
precedence):

1. **CLI options** (command-line arguments)
2. **Configuration file** (discovered or selected with `--config-file`)
3. **Presets** (listed in the configuration file's `extends`)
4. **Default values** (built-in defaults)

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
