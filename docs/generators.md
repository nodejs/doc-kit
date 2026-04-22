# Creating Generators

This guide explains how to create new documentation generators for `@node-core/doc-kit`.

## Generator Concepts

Generators in `doc-kit` transform API documentation through a pipeline. Each generator:

1. **Takes input** from a previous generator or raw files
2. **Processes the data** into a different format
3. **Yields output** for the next generator or final output

### Generator Pipeline

```
Raw Markdown Files
    ↓
  [ast] - Parse to MDAST
    ↓
  [metadata] - Extract structured metadata
    ↓
  [jsx-ast] - Convert to JSX AST
    ↓
  [web] - Generate HTML/CSS/JS bundles
```

Each generator declares its dependency using the `dependsOn` export, allowing automatic pipeline construction.

## Generator Structure

A generator is a single module (`index.mjs`) that exports its metadata and logic as named exports:

- `name` - The generator's short name (used for config keys and logging)
- `generate` - The main generation function (required)
- `processChunk` - Worker thread processing function (optional — presence enables parallel processing)
- `dependsOn` - Import specifier of the dependency generator (optional)
- `defaultConfiguration` - Default config values (optional)

## Creating a Basic Generator

### Step 1: Create the Generator Directory

Create a new directory in `src/generators/`:

```
src/generators/my-format/
├── index.mjs         # Generator entry point (required)
├── constants.mjs     # Constants (optional)
├── types.d.ts        # TypeScript types (required)
└── utils/            # Utility functions (optional)
    └── formatter.mjs
```

### Step 2: Define Types

Create a `types.d.ts` file containing a `Generator` export. Use this when typing your generator.

```ts
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

### Step 3: Implement the Generator

Create `index.mjs` with your generator's metadata and logic:

```javascript
// src/generators/my-format/index.mjs
'use strict';

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '../../utils/configuration/index.mjs';

export const name = 'my-format';
export const dependsOn = '@node-core/doc-kit/generators/metadata';
export const defaultConfiguration = {
  myCustomOption: 'myDefaultValue',
};

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

### Step 4: Register the Generator

Add an entry to the `exports` map in `packages/core/package.json`. If you follow the `index.mjs` convention, the wildcard pattern `"./generators/*": "./src/generators/*/index.mjs"` handles this automatically — no changes needed.

## Parallel Processing with Workers

For generators processing large datasets, implement parallel processing using worker threads. Export a `processChunk` function from your `index.mjs` — its presence automatically enables parallel processing.

### Implementing Worker-Based Processing

```javascript
// src/generators/parallel-generator/index.mjs
import getConfig from '../../utils/configuration/index.mjs';

export const name = 'parallel-generator';
export const dependsOn = '@node-core/doc-kit/generators/metadata';

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
  const config = getConfig('parallel-generator');

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

Generators can yield results as they're produced using async generators. Export `processChunk` to enable parallel processing, then use `async function*` for `generate`:

```javascript
// src/generators/streaming-generator/index.mjs
export const name = 'streaming-generator';
export const dependsOn = '@node-core/doc-kit/generators/metadata';

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

Some generators must collect all input before processing:

```javascript
// src/generators/batch-generator/index.mjs
export const name = 'batch-generator';
export const dependsOn = '@node-core/doc-kit/generators/jsx-ast';

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

```javascript
// src/generators/my-generator/index.mjs
export const name = 'my-generator';
export const dependsOn = '@node-core/doc-kit/generators/metadata';

export async function generate(input, worker) {
  // input contains the output from the metadata generator
}
```

### Dependency Chain Example

```javascript
// Step 1: Parse markdown to AST (no dependency)
// src/generators/ast/index.mjs
export const name = 'ast';
// No dependsOn — processes raw markdown files

// Step 2: Extract metadata from AST
// src/generators/metadata/index.mjs
export const name = 'metadata';
export const dependsOn = '@node-core/doc-kit/generators/ast';

// Step 3: Generate HTML from metadata
// src/generators/html-generator/index.mjs
export const name = 'html-generator';
export const dependsOn = '@node-core/doc-kit/generators/metadata';
```

### Multiple Consumers

Multiple generators can depend on the same generator:

```
    metadata
    ↙  ↓  ↘
  html json man-page
```

The framework ensures `metadata` runs once and its output is cached for all consumers.

## File Output

### Writing Output Files

```javascript
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

### Copying Assets

```javascript
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

### Output Structure

Organize output clearly:

```
output/
├── index.html
├── api/
│   ├── fs.html
│   ├── http.html
│   └── path.html
├── assets/
│   ├── style.css
│   └── script.js
└── data/
    └── search-index.json
```
