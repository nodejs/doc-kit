# Creating generators

Every output of doc-kit is a generator, and yours can be one too: an RSS
feed, a changelog, TypeScript declarations, anything the API entries can
become. This guide starts with a generator in one file, then adds options,
worker threads and streaming, and ends with publishing it as a package.

## Your first generator

A generator is a module whose default export gives its `name`, the generator
it reads from (`dependsOn`), and a `generate` function that receives that
generator's output. This one lists every experimental API:

```mjs displayName="experimental.mjs"
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';

export default {
  name: 'experimental',
  description: 'Lists every experimental API',

  // The typed API entries, the same the site and the JSON are built from
  dependsOn: '@doc-kit/core/metadata',

  async generate(entries) {
    const { output } = getConfig('experimental');

    const list = entries
      .filter(entry => entry.stability?.data.index === '1')
      .map(entry => `- ${entry.heading.data.name} (${entry.api})`);

    await writeFile(join(output, 'experimental.md'), list.join('\n'));
  },
};
```

Pass its path as a [target](./cli.md#doc-kit-generate), next to any others.
Here it runs next to the website (`html`), which comes from
`@doc-kit/generator-react`, so [install](./getting-started.md#install) that
package beside the CLI:

```bash
npx doc-kit generate -t html -t ./experimental.mjs -i "docs/**/*.md" -o out
```

It reads the same parse of the docs as `html`, and writes
`out/experimental.md`. (With pnpm, add `@doc-kit/core` to your dependencies
so the module can import it.)

## How generators fit together

Each generator declares the generator it reads from with `dependsOn`. doc-kit
follows those links from the targets it's given, loads every generator they
need, and runs the ones that don't depend on one another at the same time.
The shared stages are documented with the rest of the
[generators](./generators.md#pipeline-stages).

Besides `name`, `dependsOn` and `generate`, a generator can declare default
options, a function to run in worker threads, and a Markdown pipeline. The
rest of this guide covers them one at a time, and
[`@doc-kit/core`](./packages/core.md#writing-a-generator) lists every property
in one place.

## Configuration

`defaultConfiguration` holds the defaults of the generator's options. Users
override them in a section named after the generator in their
[configuration file](./configuration.md), and `getConfig(name)` returns the
result:

```mjs displayName="experimental.mjs"
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';

export default {
  name: 'experimental',
  description: 'Lists every experimental API',
  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    // The file the list is written to, in the output directory
    fileName: 'experimental.md',
  },

  async generate(entries) {
    const { output, fileName } = getConfig('experimental');

    const list = entries
      .filter(entry => entry.stability?.data.index === '1')
      .map(entry => `- ${entry.heading.data.name} (${entry.api})`);

    await writeFile(join(output, fileName), list.join('\n'));
  },
};
```

```mjs displayName="doc-kit.config.mjs"
export default {
  experimental: {
    fileName: 'unstable.md',
  },
};
```

- `getConfig(name)` is the default export of
  `@doc-kit/core/utils/configuration/index.mjs`. Besides the generator's own
  options, what it returns holds every
  [global option](./configuration.md#global-options) the generator doesn't
  set itself: `output`, `project`, `minify`, `ref`, and `version` (a `SemVer`
  from the `semver` package) among them.
- A default for a global option wins over the global value for that
  generator: `jsx-ast` defaults `ref` to `'main'`. Users still change it in
  the generator's own section.
- `defaultConfiguration` can also be a function, which receives the user's
  configuration (the configuration file and command-line options, with
  targets resolved to import specifiers) and returns the defaults. The
  [`html`](./generators/html.md) generator uses one to show its search box
  only when the search index is also a target.
- `getConfig()` without a name returns the whole configuration on the main
  thread. [Worker threads](#worker-threads) only get the generator's own
  section.

## Input and output

`generate(input, worker)` receives the complete output of the generator it
depends on. When that generator streams, its chunks arrive collected in one
array. These are the stages most generators read from:

| `dependsOn`                        | `input`                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `@doc-kit/core/metadata`           | The [API entries](./generators/metadata.md), one per heading. Most generators use this. |
| `@doc-kit/core/ast`                | The [Markdown files](./generators/ast.md), each parsed as `{ tree, path, mdx }`.        |
| `@doc-kit/core/ast-js`             | The [`.js` files](./generators/ast-js.md) among the inputs, each parsed to ESTree.      |
| `@doc-kit/generator-react/jsx-ast` | The [pages](./generators/jsx-ast.md), each with its content compiled to JSX code.       |

To read from a generator of your own, point `dependsOn` at its module with
`import.meta.resolve('./other.mjs')`, since a relative path resolves from the
working directory. Without a `dependsOn`, `generate` receives `undefined` and
reads its own sources, as [`ast`](./generators/ast.md) does.

What `generate` returns, or resolves to, is what the generators depending on
it receive. The CLI doesn't print or save a target's result, so a generator
producing an output writes its files itself. Many do both:

```mjs displayName="experimental.mjs"
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeJSON } from '@doc-kit/core/utils/file.mjs';

export default {
  name: 'experimental',
  description: 'Lists every experimental API',
  dependsOn: '@doc-kit/core/metadata',

  async generate(entries) {
    const { output, minify } = getConfig('experimental');

    const experimental = entries.filter(
      entry => entry.stability?.data.index === '1'
    );

    if (output) {
      await writeJSON(join(output, 'experimental.json'), experimental, minify);
    }

    // What the generators reading from this one receive
    return experimental;
  },
};
```

`@doc-kit/core/utils/file.mjs` has two helpers for writing:

- `writeFile(file, data[, options])` writes a file as
  `fs.promises.writeFile()` does, creating its directory first.
- `writeJSON(file, value[, minify])` writes a value as JSON, indented unless
  `minify` is `true`.

`output` is `undefined` when no output directory is given, which is why the
built-in generators check it before writing. To copy static files that ship
with your module, use `cp()` from `node:fs/promises`:

```mjs
await cp(new URL('./assets', import.meta.url), join(output, 'assets'), {
  recursive: true,
});
```

## Worker threads

For heavy work on many independent items, give the generator a
`processChunk` and set `hasParallelProcessor`. `generate` then receives a
`worker`, whose `stream()` splits the items into chunks and runs
`processChunk` on them across worker threads:

```mjs displayName="experimental.mjs"
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';

export default {
  name: 'experimental',
  description: 'Lists every experimental API',
  dependsOn: '@doc-kit/core/metadata',

  hasParallelProcessor: true,

  // Runs in a worker thread, once per chunk of entries
  async processChunk(input, itemIndices, { marker }) {
    return itemIndices
      .map(index => input[index])
      .filter(entry => entry.stability?.data.index === '1')
      .map(entry => `${marker} ${entry.heading.data.name} (${entry.api})`);
  },

  async generate(entries, worker) {
    const { output } = getConfig('experimental');
    const lines = [];

    for await (const chunk of worker.stream(entries, { marker: '-' })) {
      lines.push(...chunk);
    }

    // Chunks arrive in the order they finish
    lines.sort();

    await writeFile(join(output, 'experimental.md'), lines.join('\n'));
  },
};
```

Filtering entries is light work, but heavier work takes the same shape.

- `worker.stream(items, deps)` splits `items` into chunks of
  [`chunkSize`](./configuration.md#execution-options) items (10 by default),
  runs them on up to `threads` workers, and yields each chunk's result as it
  finishes, in the order they finish. Every `processChunk` call gets `deps`.
- `processChunk(input, itemIndices, deps)` processes the items at
  `itemIndices` and resolves to an array of results. Read each item as
  `input[index]`: in a worker, `input` holds only the chunk's items, but with
  one thread, or two items or fewer, `processChunk` runs on the main thread
  with the whole input.
- The items, `deps`, the results, and the generator's configuration section
  are copied between threads with the
  [structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm).
  Functions can't be copied (passing one throws a `DataCloneError`), and class
  instances arrive as plain objects.
- Each worker imports your module on its own, so `processChunk` sees nothing
  `generate` set up: pass what it needs in `deps`. A module only
  `processChunk` uses can be imported inside it, as the `metadata` generator
  does, so the main thread never loads it.
- In a worker, `getConfig(name)` returns the generator's own section, with
  the global options it inherits, and nothing else. Its `version` is a plain
  object there, not a `SemVer`.

## Streaming or collecting

`generate` either resolves to its whole output, as in the examples above, or
streams it: as an async generator function, it yields its results in arrays,
usually each chunk as a worker finishes it.

```mjs displayName="experimental.mjs"
export default {
  name: 'experimental',
  description: 'Lists every experimental API',
  dependsOn: '@doc-kit/core/metadata',

  hasParallelProcessor: true,

  async processChunk(input, itemIndices, { marker }) {
    return itemIndices
      .map(index => input[index])
      .filter(entry => entry.stability?.data.index === '1')
      .map(entry => `${marker} ${entry.heading.data.name} (${entry.api})`);
  },

  // Yields each chunk's lines as soon as a worker finishes them
  async *generate(entries, worker) {
    for await (const chunk of worker.stream(entries, { marker: '-' })) {
      yield chunk;
    }
  },
};
```

doc-kit collects what a streaming generator yields into one array, once, and
hands that array to every generator reading from it:

- Each value it yields must be an array, whose items are appended to the
  output.
- The output keeps the order the values were yielded in, which for
  `worker.stream()` is the order the chunks finished in.
- The generators reading from it start when the stream ends, with the
  complete output.

Streaming suits a stage other generators build on, whose output is just its
chunks' results, as `ast`, `metadata`, and `jsx-ast` are. Collect when the
generator needs every result before it can finish: to sort them,
cross-reference them, or write them to a single file.

## Declaring a dependent

`dependsOn` pulls another generator's output in. The inverse, `dependent`,
pushes a generator's output into another generator's pipeline. Use it when a
generator transforms an intermediate representation (adding, filtering, or
rewriting entries) rather than producing an output of its own. The
[`section-pages`](./generators/section-pages.md) generator, which adds a page
for each section of a module, declares two:

```mjs displayName="index.mjs"
export default {
  name: 'section-pages',

  dependsOn: '@doc-kit/core/metadata',

  // Deliver this generator's output through `html` and `sitemap`
  dependent: [
    '@doc-kit/generator-react/html',
    '@doc-kit/generator-react/sitemap',
  ],

  generate,
};
```

doc-kit walks up each dependent's pipeline, starting at the dependent itself,
and splices the generator in front of the first generator there that reads the
same `dependsOn`. `html` depends on
`jsx-ast`, which depends on `metadata`, so `jsx-ast` is rewired to read from
`section-pages` instead. `sitemap` reads `metadata` directly, so it's rewired
itself.

![A generator declaring a dependent is spliced into that dependent's pipeline](./diagrams/dependent.svg)

- Requesting a generator that declares dependents delivers its output
  through them: through the ones the run already includes, or through all of
  them when it includes none. `-t section-pages` builds the site and the
  sitemap, while `-t html -t section-pages` builds just the site.
- Several generators can splice in at the same point; they form a chain.
- A dependent whose pipeline never reads the generator's `dependsOn` is an
  error.

## Markdown pipelines

A generator processing Markdown declares its [unified](https://unifiedjs.com/)
pipeline as `markdown`, and gets a processor for it with `getProcessor(name)`:

```mjs displayName="entries-html.mjs"
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';
import { getProcessor } from '@doc-kit/core/utils/markdown/processor.mjs';

export default {
  name: 'entries-html',
  description: 'Renders every API entry to HTML',
  dependsOn: '@doc-kit/core/metadata',

  markdown: {
    remarkPlugins: ['...'],
    rehypePlugins: [
      ['remark-rehype', { allowDangerousHtml: true }],
      '...',
      '@doc-kit/core/plugins/shiki/rehype.mjs',
      ['rehype-stringify', { allowDangerousHtml: true }],
    ],
  },

  async generate(entries) {
    const { output } = getConfig('entries-html');
    const processor = getProcessor('entries-html');

    const html = await Promise.all(
      entries.map(async ({ content }) =>
        processor.stringify(await processor.run(content))
      )
    );

    await writeFile(join(output, 'entries.html'), html.join('\n'));
  },
};
```

Plugins are listed as in the
[`markdown` option](./configuration.md#markdown-plugins), and resolve from the
generator's module: paths relative to it, and packages it can import (this one
needs `remark-rehype` and `rehype-stringify` installed).

- The lists run in order, on one processor: remark plugins on the Markdown
  tree, rehype plugins on HTML, and recma plugins on JavaScript. So a rehype
  list starts with `remark-rehype`, and a recma list with `rehype-recma`.
- `'...'` marks where a list takes the configured plugins, from `global` and
  from the generator's own section. A list without one takes none, and doc-kit
  warns about plugins configured for it. A generator rendering Markdown (one
  with rehype or recma plugins) only takes the remark plugins of its own
  section, as the global ones already ran when `ast` parsed the files.
- Each thread imports the generator, and its pipeline with it, so the options
  in `markdown` can be anything, functions included. `getProcessor()` works
  in `generate` and in `processChunk` alike.
- A plugin's module default-exports the plugin, a list of plugins, or a
  preset. A plugin that needs asynchronous setup exports an async
  `load(options)` returning the plugin instead.

`getProcessor(name[, options])` takes these options:

- `mdx` {boolean} Whether the processor parses MDX. Plugins can check it with
  `this.data('mdx')`. **Default:** `false`.
- `configured` {boolean} Whether it runs the configured plugins, rather than
  only the generator's own. **Default:** `true`.

### Highlighting code

The Shiki plugin, `@doc-kit/core/plugins/shiki/rehype.mjs`, highlights code
blocks in every language Shiki bundles; its options are described in
[Code highlighting](./configuration.md#code-highlighting). To highlight other
code the way the pipeline does, `getHighlighter(name)` returns the highlighter
of a generator's Shiki plugin, and throws when its pipeline has none:

```mjs displayName="entries-html.mjs"
import { getHighlighter } from '@doc-kit/core/plugins/shiki/highlighter.mjs';

// In `generate` or `processChunk`
const highlighter = getHighlighter('entries-html');

const html = highlighter.highlightToHtml('const answer = 42;', 'js');
```

- `highlightToHtml` {Function} `highlightToHtml(code, lang[, meta])` returns
  the inner HTML of the highlighted `<code>` element.
- `highlightToHast` {Function} `highlightToHast(code, lang[, meta])` returns
  the highlighted code as a HAST tree.
- `resolveLanguage` {Function} `resolveLanguage(lang)` returns the language
  to highlight `lang` as, `'text'` when Shiki doesn't know it. It registers a
  bundled language the first time, so pass a language through it before using
  `shiki` directly.
- `shiki` {Object} The Shiki instance.
- `langs` {Array} The languages it highlights.

## Typing a generator

`@doc-kit/core` declares the types of a generator as globals, which importing
its `generators/types` module brings in:

```ts displayName="types.d.ts"
import type {} from '@doc-kit/core/generators/types';
import type { MetadataEntry } from '@doc-kit/core/generators/metadata/types';
import type { GlobalConfiguration } from '@doc-kit/core/utils/configuration/types';

export type Configuration = {
  fileName: string;
};

// What `getConfig('experimental')` returns
export type Options = GlobalConfiguration & Configuration;

export type Generator = Omit<
  GeneratorMetadata<
    // Its options
    Configuration,
    // What `generate` receives, and what it resolves to
    Generate<Array<MetadataEntry>, void>,
    // What `processChunk` gets per item, what it resolves to, and its `deps`
    ProcessChunk<MetadataEntry, Array<string>, { marker: string }>
  >,
  // `GeneratorMetadata` only takes the names of the built-in generators
  'name'
> & { name: string };
```

```mjs displayName="experimental.mjs"
import getConfig from '@doc-kit/core/utils/configuration/index.mjs';

/** @type {import('./types').Generator} */
export default {
  name: 'experimental',
  description: 'Lists every experimental API',
  dependsOn: '@doc-kit/core/metadata',
  defaultConfiguration: { fileName: 'experimental.md' },

  async generate(entries) {
    /** @type {import('./types').Options} */
    // @ts-expect-error `getConfig()` only knows the built-in generators
    const { output, fileName } = getConfig('experimental');

    // ...
  },
};
```

- The type requires `description`, `dependsOn` and `defaultConfiguration`,
  even though doc-kit doesn't: give a generator without options
  `defaultConfiguration: {}`, and one that reads its own sources
  `dependsOn: undefined`.
- `getConfig()` is typed for the built-in names only, so type checking flags a
  call with your generator's name. Mark that call with `// @ts-expect-error`
  and type its result yourself, as above.
- A generator that streams declares `AsyncGenerator<Array<Item>>` as what
  `generate` returns.

## Publishing a generator

A package exports each of its generators from a subpath:

```json displayName="package.json"
{
  "name": "doc-kit-rss",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./rss": "./src/rss/index.mjs"
  },
  "peerDependencies": {
    "@doc-kit/core": "^1.3.0"
  }
}
```

Users install it next to the CLI and pass the subpath as a target, on the
command line or in the `target` of their configuration file:

```bash
npm install --save-dev @doc-kit/cli doc-kit-rss
npx doc-kit generate -t doc-kit-rss/rss -i "docs/**/*.md" -o out
```

- List `@doc-kit/core` as a peer dependency, so the generator shares the
  CLI's copy: `getConfig()` reads the configuration the CLI gave that copy.
- A generator it depends on from another package, such as
  `@doc-kit/generator-react/jsx-ast`, needs that package installed too.
- Its `name` is the section users configure it in, so pick one that doesn't
  collide with the built-in generators.

### Adding a built-in generator

In this repository, each generator has a directory of its own, with the object
in `index.mjs`, its functions in `generate.mjs` and its types in `types.d.ts`.
A new generator also gets a subpath in its package's `exports`, such as
`"./my-format": "./src/generators/my-format/index.mjs"` in
`packages/core/package.json`, and a shorthand name in
`packages/core/src/generators/index.mjs`, which maps the name users type to
that specifier. The key matches the generator's `name`:

```mjs displayName="packages/core/src/generators/index.mjs"
export const publicGenerators = {
  json: '@doc-kit/core/json',
  'my-format': '@doc-kit/core/my-format',
  // ...
};
```

`publicGenerators` are the targets `doc-kit generate --help` lists. Stages
that produce no output of their own go in `internalGenerators` instead, which
the help leaves out. A `README.md` next to the generator's `index.mjs`,
documenting its options, becomes its page on this site; add it to the sidebar
in `www/doc-kit.config.mjs`. The
[contributing guide](https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md)
covers the rest, from running the tests to adding a changeset.
