# Configuration

A configuration file holds everything `doc-kit generate` needs: the targets
to build, where your sources are, and options for each generator, including
the ones no CLI flag covers, such as Markdown plugins and presets. With one in
place, `npx doc-kit generate` needs no flags at all. This page documents where
doc-kit finds the file, every key it takes, and how it combines with presets
and flags.

The smallest configuration names the generators to run and the files to read.
doc-kit needs both, from the file or from flags:

```mjs displayName="doc-kit.config.mjs"
export default {
  target: ['html'],
  global: {
    input: ['docs/**/*.md'],
    output: 'out',
  },
};
```

```yaml displayName=".doc-kitrc.yml"
target:
  - html
global:
  input:
    - 'docs/**/*.md'
  output: out
```

```json displayName="package.json"
{
  "name": "my-library",
  "doc-kit": {
    "target": ["html"],
    "global": {
      "input": ["docs/**/*.md"],
      "output": "out"
    }
  }
}
```

## Where configuration lives

doc-kit looks for configuration in the working directory with
[cosmiconfig](https://github.com/cosmiconfig/cosmiconfig). It takes the first
of these it finds, and doesn't look in parent directories:

1. A `doc-kit` key in `package.json`.
2. `.doc-kitrc`, which holds YAML or JSON, or `.doc-kitrc` with a `.json`,
   `.yaml`, `.yml`, `.js`, `.ts`, `.cjs`, or `.mjs` extension.
3. The same files in a `.config/` directory, without the leading dot, such as
   `.config/doc-kitrc.json`.
4. `doc-kit.config.js`, `.ts`, `.cjs`, or `.mjs`.

To skip the search, pass `--config-file <path>` to load one file, relative to
the working directory.

JavaScript files default-export the configuration (or assign it to
`module.exports`). TypeScript files work the same way: Node.js strips their
types as it loads them, so they can use type annotations and other erasable
syntax, but not features such as enums. JSON and YAML files hold the object
directly.

> [!IMPORTANT]
> Paths in your configuration, such as `input`, `output`, and generator
> options like `templatePath`, are relative to the working directory, not to
> the configuration file. The exceptions are `extends` and Markdown plugins,
> which resolve from the file that lists them. To run doc-kit from another
> directory with `--config-file`, make the paths absolute, for example with
> `import.meta.dirname`.

## A complete example

```mjs displayName="doc-kit.config.mjs"
/** @type {import('@doc-kit/core/utils/configuration/types').Configuration} */
export default {
  // The generators to run
  target: ['html', 'orama-db', 'sitemap'],

  // Options every generator shares
  global: {
    project: 'My Library',
    version: '2.1.0',
    repository: 'my-org/my-library',
    baseURL: 'https://my-library.dev/docs',
    input: ['docs/**/*.md'],
    ignore: ['docs/drafts/**'],
    output: 'out',
    minify: true,
  },

  // How the work is spread across threads
  threads: 2,

  // Options of one generator, under its name
  html: {
    title: '{project} {version} docs',
  },

  metadata: {
    typeMap: 'docs/type-map.json',
  },
};
```

The configuration object takes these top-level keys:

| Key                                | What it holds                          | Reference                               |
| ---------------------------------- | -------------------------------------- | --------------------------------------- |
| `target`                           | The generators to run                  | [Targets](#targets)                     |
| `global`                           | Options every generator shares         | [Global options](#global-options)       |
| `threads`, `chunkSize`             | How the work is spread across threads  | [Execution options](#execution-options) |
| A generator's name, such as `html` | Options of that generator alone        | [Generator options](#generator-options) |
| `extends`                          | Presets your configuration builds upon | [Extending presets](#extending-presets) |

## Targets

- `target` {string|string[]} The generators to run: built-in names, such as
  `html`, `orama-db`, or `json` (see the
  [generators overview](./generators.md)), or the import specifier or path of
  a [custom generator](./creating-generators.md). A path must be absolute or
  start with `.`, and resolves against the working directory. The stages a
  target depends on run without being listed.

## Global options

Options under `global` apply to every generator. A generator's own section
can override any of them for that generator alone; see
[Generator options](#generator-options).

- `input` {string[]} Glob patterns of the files to read: Markdown and MDX, and
  `.js` files for generators that parse JavaScript. Always an array, even for
  a single pattern. Required, here or with `--input`.
- `ignore` {string|string[]} Glob patterns of files to leave out of `input`.
- `output` {string} Directory to write to.
- `project` {string} The project's name, used in titles, logos, and templated
  text. **Default:** the `name` in the working directory's `package.json`, or
  `'API Docs'`.
- `version` {string} Version of the project being documented, coerced to
  semver, so `'2'` means `2.0.0`. **Default:** the version of Node.js running
  doc-kit.
- `repository` {string} GitHub repository as `owner/name`, used for source
  links and the repository link in the site's navigation bar. Without one,
  that link is left out.
- `ref` {string} Git branch, tag, or commit that links into the repository
  point to, such as edit links. The site's source links follow `jsx-ast.ref`
  instead, which defaults to `'main'` (see [Precedence](#precedence)).
  **Default:** `'HEAD'`.
- `baseURL` {string} URL the docs are published at, without a trailing slash,
  such as `'https://my-library.dev/docs'`. Generators build absolute URLs from
  it, such as those in the sitemap and `llms.txt`. It must be a string: the
  configuration is copied to worker threads, which can't receive a `URL`
  object.
- `minify` {boolean} Minify the output where the generator supports it, such
  as HTML pages, JSON files, and the search index. **Default:** `false`.
- `changelog` {string|Array} Release history for the site's version selector:
  the path or URL of a changelog in the format of Node.js's `CHANGELOG.md`, or,
  in a JavaScript file, an array of `{ version, isLts, isCurrent }` entries
  with `SemVer` versions. See
  [Publishing several versions](./publishing.md#publishing-several-versions).
  **Default:** `[]`, which builds a single version without a selector.
- `index` {string|Array} The path or URL of an `index.md` whose links
  (`* [Title](file.md)`) set the order of the documents in the JSON bundle,
  or, in a JavaScript file, the parsed list of `{ section, api }` objects.
- `pathsToCopy` {Array} Files and directories the `html` generator copies into
  the output directory. A string copies that path under its own name; an
  object maps source paths to destinations inside the output, such as
  `{ 'docs/images': 'images' }`. Paths that don't exist are skipped.
  **Default:** `['assets', 'public', 'static']`.
- `markdown` {Object} Markdown plugins for every generator that processes
  Markdown. See [Markdown plugins](#markdown-plugins).

## Execution options

These sit at the top level, next to `target` and `global`:

- `threads` {number} Worker threads to process with, at least 1. With `1`,
  everything runs on the main thread. **Default:** the number of CPUs, up to
  4 (`1` on riscv64).
- `chunkSize` {number} Items each worker processes per task, at least 1.
  **Default:** `10`.

Each worker's heap is limited to 512 MB. If a build runs out of memory, lower
`threads`, or raise the limit by running Node.js with `--max-old-space-size`,
directly or through `NODE_OPTIONS`.

## Generator options

Each generator reads its options from the section named after it, which for
built-in generators is the target name. Every generator's reference page
lists its options:

| Section            | Its own options                                                                                                       | Reference                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `html`             | `title`, `pageURL`, `editURL`, `navigation`, `head`, `stylesheets`, `imports`, `components`, `templatePath`, and more | [Website](./generators/html.md), [Customizing the site](./customization.md)   |
| `section-pages`    | `maxDepth`, `exclude`                                                                                                 | [Section pages](./generators/section-pages.md)                                |
| `sitemap`          | `indexURL`, `pageURL`                                                                                                 | [Sitemap](./generators/sitemap.md)                                            |
| `llms-txt`         | `templatePath`, `pageURL`                                                                                             | [llms.txt](./generators/llms-txt.md)                                          |
| `llms-txt-full`    | `pageURL`                                                                                                             | [llms-full.txt](./generators/llms-txt.md#llms-fulltxt)                        |
| `json`, `json-all` | `schemaURL`                                                                                                           | [JSON](./generators/json.md), [JSON bundle](./generators/json.md#json-bundle) |
| `metadata`         | `typeMap`                                                                                                             | [API entries](./generators/metadata.md)                                       |
| `jsx-ast`          | `ref`, `generateNotFoundPage`, `showReadingTime`                                                                      | [Page JSX](./generators/jsx-ast.md)                                           |
| `man-page`         | `fileName`, `templatePath`, `cliOptionsHeaderSlug`, `envVarsHeaderSlug`                                               | [Man page](./generators/man-page.md)                                          |
| `api-links`        | `sourceURL`                                                                                                           | [API links](./generators/api-links.md)                                        |

`metadata.typeMap`, in the complete example above, is a JSON file mapping type
names to the URLs documenting them, such as
`{ "MyThing": "https://example.com/my-thing" }`.

A section also takes any global option, which then applies to that generator
alone. Its `markdown` is the exception: it adds to `global.markdown` instead
of replacing it.

```mjs displayName="doc-kit.config.mjs"
export default {
  global: {
    minify: true,
  },

  // Keep the search index readable
  'orama-db': {
    minify: false,
  },
};
```

Several options are templates: `{name}` is replaced by the configuration value
of that name, such as `{project}`, `{version}`, or `{baseURL}`, and
`{name|fallback}` uses `fallback` when the value isn't set. Each generator's
page lists the placeholders it adds, such as `{path}`.

## Markdown plugins

doc-kit processes Markdown with [unified](https://unifiedjs.com/).
`global.markdown` adds plugins to every generator that processes Markdown,
and a generator's own `markdown` adds plugins to that generator alone, after
the global ones:

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
        ['./plugins/rehype-callouts.mjs', { theme: 'neutral' }],
      ],
    },
  },
};
```

`markdown` takes three lists, one for each kind of syntax tree:

- `remarkPlugins` {Array} Plugins run on Markdown syntax trees.
- `rehypePlugins` {Array} Plugins run on HTML syntax trees.
- `recmaPlugins` {Array} Plugins run on JavaScript syntax trees.

Each entry is a module specifier (a package name, or a path relative to the
file that lists it), alone or in a `[specifier, options]` pair. The module
default-exports the plugin, a list of plugins, or a unified preset. It can
instead export an async `load` function that takes the options and returns
the plugin, for setup a plugin can't do itself.

Markdown is processed in worker threads, which import the plugins
themselves. Entries must therefore be specifiers, not imported functions, and
options must be plain data. To pass a plugin options that include functions,
configure it in a module of your own and list that module.

### Where plugins run

A generator only takes the lists its pipeline has a place for:

| Generator                           | `remarkPlugins`                                        | `rehypePlugins`                                | `recmaPlugins`                                 |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| `ast`                               | Global and its own, run on each document once parsed   | No                                             | No                                             |
| `metadata`, `json`, `llms-txt-full` | Global and its own, to parse and serialize Markdown    | No                                             | No                                             |
| `jsx-ast`                           | Its own only, run on each page before alerts are built | Global and its own, before code is highlighted | Global and its own, before the code is printed |

Global remark plugins run on each document as `ast` parses it, so every
output sees their changes. The generators that parse or serialize Markdown
again load them too, so syntax extensions such as `remark-math` work there.
`jsx-ast` doesn't run them a second time.

Plugins listed for a generator that doesn't take them, such as
`html.markdown`, are ignored with a warning.

A generator runs each plugin once. Listing a plugin it already has, as one of
its own or a global one, configures that plugin instead of adding it again:
the options merge, with arrays added together and objects merged key by key.

The plugins configured for `jsx-ast` don't apply to the fragments it renders
on their own: types, the descriptions in typed lists, and change history
notes.

### Code highlighting

`jsx-ast` highlights code with the `@doc-kit/core/plugins/shiki/rehype.mjs`
plugin, which runs [Shiki](https://shiki.style/) with every language Shiki
bundles, loading each one the first time code uses it. Code in a language it
doesn't know is shown as plain text.

To configure it, list it with options in `jsx-ast.markdown.rehypePlugins`.
Since `jsx-ast` already has the plugin, your options merge into it rather
than adding a second highlighter. With pnpm, add `@doc-kit/core` to your
dependencies so that your configuration file can resolve it.

- `langs` {Array} More languages: grammars, or modules default-exporting a
  grammar or a list of them.
- `langAlias` {Object} More names for languages, such as `{ conf: 'ini' }`.
- `themes` {Object} The themes code is shown in. **Default:**
  `github-light-default` and a higher-contrast `nord`.
  - `light` {string|Object} The light theme: the name of a theme Shiki
    bundles, a module default-exporting a theme, or a theme.
  - `dark` {string|Object} The dark theme, in the same forms.
- `transformers` {Array} Modules default-exporting
  [Shiki transformers](https://shiki.style/guide/transformers), or lists of
  them.

The modules in these options are paths relative to the working directory, or
URLs, such as the ones `import.meta.resolve()` returns:

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

## Extending presets

- `extends` {string|string[]} Presets to build your configuration on. A preset
  is a JavaScript module whose default export is a configuration object, so a
  team can share one as a package. Each entry is an import specifier or a path
  relative to the configuration file. Later presets win over earlier ones, and
  your own values win over all of them.

```mjs displayName="doc-kit.config.mjs"
export default {
  // Build the docs the way nodejs.org does: branding, URL layouts, and
  // release history included
  extends: '@node-core/doc-kit/config',

  global: {
    input: ['doc/api/*.md'],
    output: 'out',
  },

  html: {
    // Your own values win over the preset's
    title: '{project} {version} API reference',
  },
};
```

Markdown plugins in a preset resolve from the preset's own file. A preset's
own `extends` isn't followed.

The built-in defaults are project-neutral: no repository, site URL, release
history, or branding is assumed. The `@node-core/doc-kit/config` preset, from
the [`@node-core/doc-kit`](./packages/node.md) package, opts back into
everything Node.js-specific; install that package to use it.

## Precedence

When more than one source sets a value, the first of these wins:

1. CLI flags.
2. The configuration file.
3. Presets from `extends`, later ones first.
4. Built-in defaults.

Objects merge key by key. Arrays and other values replace the value beneath
them instead of adding to it, so `--input` replaces the configured `input`,
and a file's `global.markdown.remarkPlugins` replaces a preset's list.

Each generator then reads its own section and takes from `global` only the
keys that section doesn't set. A generator's built-in defaults count as set:
`jsx-ast` defaults `ref` to `'main'`, so the site's source links point at
`main` unless you set `jsx-ast.ref`, whatever `global.ref` or `--git-ref`
says.

## CLI flags

Each [`doc-kit generate`](./cli.md#doc-kit-generate) flag sets one
configuration key, and wins over the file. `--config-file` picks the file
itself, and has no key.

| Flag                          | Configuration key  |
| ----------------------------- | ------------------ |
| `-t, --target <generator...>` | `target`           |
| `-i, --input <patterns...>`   | `global.input`     |
| `--ignore <patterns...>`      | `global.ignore`    |
| `-o, --output <directory>`    | `global.output`    |
| `-v, --version <semver>`      | `global.version`   |
| `--git-ref <ref>`             | `global.ref`       |
| `-c, --changelog <url>`       | `global.changelog` |
| `--index <url>`               | `global.index`     |
| `--minify`                    | `global.minify`    |
| `--type-map <url>`            | `metadata.typeMap` |
| `-p, --threads <number>`      | `threads`          |
| `--chunk-size <number>`       | `chunkSize`        |
