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

Each generator declares its dependency using the `dependsOn` field, allowing automatic pipeline construction.

## Generator Structure

A generator is defined as a module exporting an object conforming to the `GeneratorMetadata` interface.

## Creating a Basic Generator

### Step 1: Create the Generator Files

Create a new directory in `src/generators/`:

```
src/generators/my-format/
├── index.mjs         # Generator metadata (required)
├── generate.mjs      # Generator implementation (required)
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

### Step 3: Define Generator Metadata

Create the generator metadata in `index.mjs` using `createLazyGenerator`:

```javascript
// src/generators/my-format/index.mjs
import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * Generates output in MyFormat.
 *
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'my-format',

  version: '1.0.0',

  description: 'Generates documentation in MyFormat',

  // This generator depends on the metadata generator
  dependsOn: 'metadata',

  defaultConfiguration: {
    // If your generator supports a custom configuration, define the defaults here
    myCustomOption: 'myDefaultValue',

    // All generators support options in the GlobalConfiguration object
    // To override the defaults, they can be specified here
    ref: 'overriddenRef',
  },
});
```

### Step 4: Implement the Generator Logic

Create the generator implementation in `generate.mjs`:

```javascript
// src/generators/my-format/generate.mjs
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

### Step 5: Register the Generator

Add your generator to the exports in `src/generators/index.mjs`:

```javascript
// For public generators (available via CLI)
import myFormat from './my-format/index.mjs';

export const publicGenerators = {
  'json-simple': jsonSimple,
  'my-format': myFormat, // Add this
  // ... other generators
};

// For internal generators (used only as dependencies)
const internalGenerators = {
  ast,
  metadata,
  // ... internal generators
};
```

## Parallel Processing with Workers

For generators processing large datasets, implement parallel processing using worker threads.

### Implementing Worker-Based Processing

First, define the generator metadata in `index.mjs`:

```javascript
// src/generators/parallel-generator/index.mjs
import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'parallel-generator',

  version: '1.0.0',

  description: 'Processes data in parallel',

  dependsOn: 'metadata',

  // Indicates this generator has a processChunk implementation
  hasParallelProcessor: true,
});
```

Then, implement both `processChunk` and `generate` in `generate.mjs`:

```javascript
// src/generators/parallel-generator/generate.mjs
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
  for await (const chunkResult of worker.stream(input, input, deps)) {
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

```javascript
// src/generators/streaming-generator/index.mjs
import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'streaming-generator',

  version: '1.0.0',

  description: 'Streams results as they are ready',

  dependsOn: 'metadata',

  hasParallelProcessor: true,
});
```

Implement the generator in `generate.mjs`:

```javascript
// src/generators/streaming-generator/generate.mjs
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
  for await (const chunkResult of worker.stream(input, input, {})) {
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

```javascript
// src/generators/batch-generator/index.mjs
import { createLazyGenerator } from '../../utils/generators.mjs';

/**
 * @type {import('./types').Generator}
 */
export default createLazyGenerator({
  name: 'batch-generator',

  version: '1.0.0',

  description: 'Requires all input at once',

  dependsOn: 'jsx-ast',
});
```

Implementation in `generate.mjs`:

```javascript
// src/generators/batch-generator/generate.mjs
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

```javascript
import { createLazyGenerator } from '../../utils/generators.mjs';

export default createLazyGenerator({
  name: 'my-generator',

  dependsOn: 'metadata', // This generator requires metadata output

  // ... other metadata
});
```

In `generate.mjs`:

```javascript
export async function generate(input, worker) {
  // input contains the output from 'metadata' generator
}
```

### Dependency Chain Example

```javascript
// Step 1: Parse markdown to AST
// src/generators/ast/index.mjs
export default createLazyGenerator({
  name: 'ast',
  dependsOn: undefined,  // No dependency
  // Processes raw markdown files
});

// Step 2: Extract metadata from AST
// src/generators/metadata/index.mjs
export default createLazyGenerator({
  name: 'metadata',
  dependsOn: 'ast',  // Depends on AST
  // Processes AST output
});

// Step 3: Generate HTML from metadata
// src/generators/html-generator/index.mjs
export default createLazyGenerator({
  name: 'html-generator',
  dependsOn: 'metadata',  // Depends on metadata
  // Processes metadata output
});
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

In `generate.mjs`:

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
