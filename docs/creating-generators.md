# Creating Generators

This guide explains how to create new documentation generators for `@doc-kit/core`.

## Generator Concepts

Generators in `doc-kit` transform API documentation through a pipeline. Each generator:

1. **Takes input** from a previous generator or raw files
2. **Processes the data** into a different format
3. **Yields output** for the next generator or final output

### Generator Pipeline

```text
Raw Markdown Files
    ↓
  [ast] - Parse to MDAST
    ↓
  [metadata] - Extract structured metadata
    ↓
  [jsx-ast] - Convert to JSX AST
    ↓
  [html] - Generate HTML/CSS/JS bundles
```

Each generator declares its dependency using the `dependsOn` field, allowing automatic pipeline construction. Each stage is documented alongside the rest of the [generators](./generators.md#pipeline-stages).

## Generator Structure

A generator is defined as a module exporting an object conforming to the `GeneratorMetadata` interface.

## Creating a Basic Generator

### Step 1: Create the Generator Files

Create a new directory in your project:

```text
/
├── index.mjs         # Generator metadata (required)
├── generate.mjs      # Generator implementation (required)
├── constants.mjs     # Constants (optional)
├── types.d.ts        # TypeScript types (required)
└── utils/            # Utility functions (optional)
    └── formatter.mjs
```

### Step 2: Define Types

Create a `types.d.ts` file containing a `Generator` export. Use this when typing your generator.

```typescript displayName="types.d.ts"
export type Generator = GeneratorMetadata<
  {
    // If your generator supports a custom configuration,
    // define it here
    myCustomOption: string;
  },
  Generate<InputToMyGenerator, Promise<OutputOfMyGenerator>>,
  // If your generator supports parallel processing:
  ProcessChunk<
    InputToMyParallelProcessor,
    OutputOfMyParallelProcessor,
    DependenciesOfMyParallelProcessor
  >
>;
```

### Step 3: Define Generator Metadata

A generator module's default export is a plain object with its metadata and
implementation. Create it in `index.mjs`:

```mjs displayName="index.mjs"
import { generate } from './generate.mjs';

/**
 * Generates output in MyFormat.
 *
 * @type {import('./types').Generator}
 */
export default {
  name: 'my-format',

  description: 'Generates documentation in MyFormat',

  // This generator depends on the metadata generator. Dependencies are
  // declared as import specifiers, so they can live in any package.
  dependsOn: '@doc-kit/core/metadata',

  defaultConfiguration: {
    // If your generator supports a custom configuration, define the defaults here
    myCustomOption: 'myDefaultValue',

    // All generators support options in the GlobalConfiguration object
    // To override the defaults, they can be specified here
    ref: 'overriddenRef',
  },

  generate,
};
```

### Step 4: Implement the Generator Logic

Create the generator implementation in `generate.mjs`:

```mjs displayName="generate.mjs"
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';

/**
 * Main generation function
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input, worker) {
  const config = getConfig('my-format');

  // Transform input to your format
  const result = transformToMyFormat(input, config.version);

  // Write to file if output directory specified
  if (config.output) {
    await writeFile(
      join(config.output, 'documentation.myformat'),
      result,
      'utf-8'
    );
  }

  return result;
}

/**
 * Transform metadata entries to MyFormat
 * @param {Array<MetadataEntry>} entries
 * @param {import('semver').SemVer} version
 * @returns {string}
 */
function transformToMyFormat(entries, version) {
  // Your transformation logic here
  return entries
    .map(entry => `${entry.api}: ${entry.heading.data.name}`)
    .join('\n');
}
```

`generate` is called with the input, a worker for
[parallel processing](#parallel-processing-with-workers), and the generator
context (`GeneratorContext`): what the orchestrator provides besides the
input. Its one property so far is `incremental`, the generator's section of
the manifest of an [incremental build](#incremental-builds); when the build
is not incremental, its methods are all no-ops.

### Step 5: Make the Generator Loadable

Generators are loaded dynamically by import specifier. Anything that resolves
to a module whose default export is a generator works as a `--target`:

```bash
# A package (subpath) export
npx @doc-kit/cli generate -t @my-scope/my-package/my-format ...

# A local file
npx @doc-kit/cli generate -t ./generators/my-format/index.mjs ...
```

Built-in generators additionally get a shorthand alias in
`packages/core/src/generators/index.mjs`, which maps the name users type to
the import specifier it resolves to:

```mjs displayName="packages/core/src/generators/index.mjs"
export const publicGenerators = {
  'json-simple': '@doc-kit/core/json-simple',
  'my-format': '@doc-kit/core/my-format', // Add this
  // ... other generators
};
```

If the generator lives in this repository, also add a matching subpath to the
`exports` map of its package's `package.json`.

## Parallel Processing with Workers

For generators processing large datasets, implement parallel processing using worker threads.

### Implementing Worker-Based Processing

First, define the generator metadata in `index.mjs`:

```mjs displayName="index.mjs"
import { generate, processChunk } from './generate.mjs';

/**
 * @type {import('./types').Generator}
 */
export default {
  name: 'parallel-generator',

  description: 'Processes data in parallel',

  dependsOn: '@doc-kit/core/metadata',

  // Indicates this generator has a processChunk implementation
  hasParallelProcessor: true,

  generate,
  processChunk,
};
```

Then, implement both `processChunk` and `generate` in `generate.mjs`:

```mjs displayName="generate.mjs"
import getConfig from '../../utils/configuration/index.mjs';

/**
 * Process a chunk of items in a worker thread.
 * This function runs in isolated worker threads.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(fullInput, itemIndices, deps) {
  const results = [];

  // Process only the items at specified indices
  for (const idx of itemIndices) {
    const item = fullInput[idx];
    const result = await processItem(item, deps);
    results.push(result);
  }

  return results;
}

/**
 * Main generation function that orchestrates worker threads
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // Configuration for this generator is based on its name
  const config = getConfig('my-format');

  // Prepare serializable dependencies
  const deps = {
    version: config.version,
    // ...other config
  };

  // Stream chunks as they complete
  for await (const chunkResult of worker.stream(input, deps)) {
    // Process chunk result if needed
    yield chunkResult;
  }
}
```

### Key Points for Worker Processing

1. **`processChunk` executes in worker threads** - No access to main thread state
2. **Only serializable data** can be passed to workers (no functions, classes, etc.)
3. **`fullInput` and `itemIndices`** - Workers receive full input but only process specified indices
4. **`deps` must be serializable** - Pass only JSON-compatible data

### When to Use Workers

Use parallel processing when:

- Processing many independent items (files, modules, entries)
- Each item takes significant time to process
- Operations are CPU-intensive

Don't use workers when:

- Items have dependencies on each other
- Output must be in specific order
- Operation is I/O bound rather than CPU bound

## Streaming Results

Generators can yield results as they're produced using async generators.

Define the generator metadata in `index.mjs`:

```mjs displayName="index.mjs"
import { generate, processChunk } from './generate.mjs';

/**
 * @type {import('./types').Generator}
 */
export default {
  name: 'streaming-generator',

  description: 'Streams results as they are ready',

  dependsOn: '@doc-kit/core/metadata',

  hasParallelProcessor: true,

  generate,
  processChunk,
};
```

Implement the generator in `generate.mjs`:

```mjs displayName="generate.mjs"
/**
 * Process a chunk of data
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(fullInput, itemIndices, deps) {
  // Process chunk
  return results;
}

/**
 * Generator function that yields results incrementally
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // Stream results as workers complete chunks
  for await (const chunkResult of worker.stream(input, {})) {
    // Yield immediately - downstream can start processing
    yield chunkResult;
  }
}
```

### Benefits of Streaming

- **Reduced memory usage** - Process data in chunks
- **Earlier downstream starts** - Next generator can begin before this one finishes
- **Better parallelism** - Multiple generators can work simultaneously

### Non-Streaming Generators

Some generators must collect all input before processing.

Generator metadata in `index.mjs`:

```mjs displayName="index.mjs"
import { generate } from './generate.mjs';

/**
 * @type {import('./types').Generator}
 */
export default {
  name: 'batch-generator',

  description: 'Requires all input at once',

  dependsOn: '@doc-kit/generator-react/jsx-ast',

  generate,
};
```

Implementation in `generate.mjs`:

```mjs displayName="generate.mjs"
/**
 * Non-streaming - returns Promise instead of AsyncGenerator
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input, worker) {
  // Collect all input (if dependency is streaming, this waits for completion)
  const allData = await collectAll(input);

  // Process everything together
  const result = processBatch(allData);

  return result;
}
```

Use non-streaming when:

- You need all data to make decisions (e.g., code splitting, global analysis)
- Output format requires complete dataset
- Cross-references between items need resolution

## Generator Dependencies

### Declaring Dependencies

In `index.mjs`:

```mjs displayName="index.mjs"
import { generate } from './generate.mjs';

export default {
  name: 'my-generator',

  // This generator requires the metadata generator's output. The dependency
  // is an import specifier, so it may point at any installed package.
  dependsOn: '@doc-kit/core/metadata',

  // ... other metadata

  generate,
};
```

In `generate.mjs`:

```mjs displayName="generate.mjs"
export async function generate(input, worker) {
  // input contains the output from 'metadata' generator
}
```

### Declaring a dependent

`dependsOn` pulls another generator's output _in_. The inverse, `dependent`,
pushes a generator's output _into_ another generator's pipeline:

```mjs displayName="index.mjs"
export default {
  name: 'section-pages',

  dependsOn: '@doc-kit/core/metadata',

  // Deliver this generator's output through `html`
  dependent: '@doc-kit/generator-react/html',

  generate,
};
```

The pipeline splices such a generator in front of the first generator on the
way to its dependent that consumes the same `dependsOn`. Here `html` depends on
`jsx-ast`, which depends on `metadata` — so `jsx-ast` is rewired to read from
`section-pages` instead:

```text
ast → metadata → section-pages → jsx-ast → html
```

Requesting a generator that declares a dependent runs the dependent's whole
pipeline, and the run's result is the dependent's output — `-t section-pages`
produces the `html` site. Several generators may splice in at the same point;
they form a chain. A generator whose dependent pipeline never consumes its
`dependsOn` is an error.

`dependent` also accepts an array. The generator is spliced into every listed
pipeline; when requested, it is delivered through the dependents that are
already part of the run, or through all of them when none is:

```mjs displayName="index.mjs"
export default {
  name: 'section-pages',
  dependsOn: '@doc-kit/core/metadata',
  dependent: [
    '@doc-kit/generator-react/html',
    '@doc-kit/generator-react/sitemap',
  ],
  generate,
};
```

With this, `-t section-pages` builds the site and the sitemap, while
`-t html -t section-pages` builds just the site.

Use a dependent when a generator transforms an intermediate representation
(adding, filtering, or rewriting entries) rather than producing a new output
format of its own. See the [`section-pages`](./generators/section-pages.md) generator for
a worked example.

## Markdown pipelines

A generator processing Markdown declares its [unified](https://unifiedjs.com/)
pipeline as `markdown`, listing plugins as the
[`markdown` option](./configuration.md#markdown-plugins) does, with paths
relative to its module. The rehype list starts with `remark-rehype`, and the
recma list with `rehype-recma`. Each list takes the configured plugins in place
of its `'...'`, and a list without one takes none. As every thread running the
generator imports it, options may be anything, functions included.

```mjs displayName="index.mjs"
export default {
  name: 'my-generator',

  dependsOn: '@doc-kit/core/metadata',

  markdown: {
    remarkPlugins: ['remark-parse', 'remark-gfm', '...'],
    rehypePlugins: [
      ['remark-rehype', { allowDangerousHtml: true }],
      '...',
      ['rehype-stringify', { allowDangerousHtml: true }],
    ],
  },

  generate,
};
```

`getProcessor(name)` gives the generator's processor, on each thread it runs
on:

```mjs displayName="generate.mjs"
import { getProcessor } from '@doc-kit/core/utils/markdown/processor.mjs';

export async function generate(input) {
  const processor = getProcessor('my-generator');

  return Promise.all(
    input.map(async ({ content }) =>
      processor.stringify(await processor.run(content))
    )
  );
}
```

`getProcessor(name, { mdx: true })` returns an MDX processor (plugins can
check `this.data('mdx')`), and `getProcessor(name, { configured: false })` one
without the configured plugins. A generator rendering Markdown (with rehype or
recma plugins) only takes its own remark plugins, as the global ones already
ran when `ast` parsed the Markdown.

A plugin needing asynchronous setup can export an async `load(options)`
returning the plugin, instead of a default export. The Shiki plugin does, and
`getHighlighter(name)` (from `@doc-kit/core/plugins/shiki/highlighter.mjs`)
returns the highlighter of a generator's Shiki plugin, to highlight code as its
pipeline does. It registers Shiki's bundled languages as code in them is
highlighted, so before using its `shiki` instance directly, pass the language
through its `resolveLanguage`.

## File Output

### Writing Output Files

In `generate.mjs`:

```mjs displayName="generate.mjs"
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';

export async function generate(input, worker) {
  const config = getConfig('my-format');

  if (!config.output) {
    // Return data without writing
    return result;
  }

  // Ensure directory exists
  await mkdir(config.output, { recursive: true });

  // Write single file
  await writeFile(join(config.output, 'output.txt'), content, 'utf-8');

  // Write multiple files
  for (const item of items) {
    await writeFile(
      join(config.output, `${item.name}.txt`),
      item.content,
      'utf-8'
    );
  }

  return result;
}
```

### Incremental builds

An incremental build makes again only the items whose output the previous
build did not make from the same key, and keeps the manifest of what every
item produced at `<output>/.doc-kit/manifest.json`. The `incremental`
property of the [generator context](#step-4-implement-the-generator-logic) is
the generator's section of it:

```mjs displayName="generate.mjs"
import { writeFile } from '@doc-kit/core/utils/file.mjs';

export async function generate(input, worker, { incremental }) {
  // `stale` are the items to make again; the rest keep their files. `files`
  // names what an item makes, be it one file or many.
  const { stale } = incremental.partition(input, {
    files: item => `${item.api}.myformat`,
  });

  for (const item of stale) {
    await writeFile(join(config.output, `${item.api}.myformat`), render(item));
  }

  // Removes the previous build's files this one did not record
  await incremental.prune();
}
```

An item's key is its JSON, hashed with the generator's configuration, so a
configuration change makes everything again. The generator's metadata can
refine that under `incremental`:

- `key(item)` is what an item's output is made from instead: a string, bytes,
  or an array of them.
- `omit` lists the configuration keys that do not shape the output, such as
  paths and functions. `input`, `output`, `ignore` and `pathsToCopy` are
  always left out.
- `salt` lists further parts of every key, such as a format version.

`partition(items, { key, files })` takes a key function in place of the
declared one, and `salt(compute)` adds parts computed at run time, such as
the hash of a built component library; `compute` only runs in an incremental
build, and before any key is derived. Files that belong to no item, such as
assets, or whose names are only known once made, are recorded by hand:
`record(item, ...files)`, with a label in place of the item for the former.

Without `experimentalIncremental` (or an `output`) every item is stale and
nothing is recorded, so the generator needs no branches of its own. Whether
or not a generator uses its section, writing through core's `writeFile` (or
`writeJSON`) leaves a file alone during an incremental build when it already
holds the same bytes.

### Copying Assets

```mjs displayName="generate.mjs"
import { cp } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';

export async function generate(input, worker) {
  const config = getConfig('my-format');

  if (config.output) {
    // Copy asset directory
    await cp(
      new URL('./assets', import.meta.url),
      join(config.output, 'assets'),
      { recursive: true }
    );
  }

  return result;
}
```
