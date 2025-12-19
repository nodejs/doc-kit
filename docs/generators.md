# Creating Generators

This guide explains how to create new documentation generators for `@nodejs/doc-kit`.

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

A generator is defined as a module exporting an object conforming to the `GeneratorMetadata` interface:

```typescript
interface GeneratorMetadata<Input, Output> {
  name: string;
  version: string;
  description: string;
  dependsOn?: string;

  // Core generation function
  generate(
    input: Input,
    options: Partial<GeneratorOptions>
  ): Promise<Output> | AsyncGenerator<Output>;

  // Optional: for parallel processing
  processChunk?(
    fullInput: any,
    itemIndices: number[],
    deps: any
  ): Promise<Output>;
}
```

## Creating a Basic Generator

### Step 1: Create the Generator File

Create a new directory in `src/generators/`:

```
src/generators/my-format/
├── index.mjs         # Main generator file
├── constants.mjs     # Constants (optional)
├── types.d.ts        # TypeScript types (optional)
└── utils/            # Utility functions (optional)
    └── formatter.mjs
```

### Step 2: Implement the Generator

```javascript
// src/generators/my-format/index.mjs
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Generates output in MyFormat.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 * @typedef {string} Output
 *
 * @type {GeneratorMetadata<Input, Output>}
 */
export default {
  name: 'my-format',

  version: '1.0.0',

  description: 'Generates documentation in MyFormat',

  // This generator depends on the metadata generator
  dependsOn: 'metadata',

  /**
   * Main generation function
   *
   * @param {Input} input - Metadata entries from previous generator
   * @param {Partial<GeneratorOptions>} options - Configuration
   * @returns {Promise<Output>}
   */
  async generate(input, { output, version }) {
    // Transform input to your format
    const result = transformToMyFormat(input, version);

    // Write to file if output directory specified
    if (output) {
      await writeFile(join(output, 'documentation.myformat'), result, 'utf-8');
    }

    return result;
  },
};

/**
 * Transform metadata entries to MyFormat
 * @param {Input} entries
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

### Step 3: Register the Generator

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

```javascript
export default {
  name: 'parallel-generator',
  version: '1.0.0',
  description: 'Processes data in parallel',
  dependsOn: 'metadata',

  /**
   * Process a chunk of items in a worker thread.
   * This function runs in isolated worker threads.
   *
   * @param {Array<Item>} fullInput - Complete input array
   * @param {number[]} itemIndices - Indices of items to process
   * @param {Object} deps - Serializable dependencies
   * @returns {Promise<Array<Result>>}
   */
  async processChunk(fullInput, itemIndices, deps) {
    const results = [];

    // Process only the items at specified indices
    for (const idx of itemIndices) {
      const item = fullInput[idx];
      const result = await processItem(item, deps);
      results.push(result);
    }

    return results;
  },

  /**
   * Main generation function that orchestrates worker threads
   *
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async *generate(input, { worker, output }) {
    // Prepare serializable dependencies
    const deps = {
      version: options.version,
      ...someConfig,
    };

    // Stream chunks as they complete
    for await (const chunkResult of worker.stream(input, input, deps)) {
      // Process chunk result if needed
      yield chunkResult;
    }
  },
};
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

Generators can yield results as they're produced using async generators:

```javascript
export default {
  name: 'streaming-generator',
  version: '1.0.0',
  description: 'Streams results as they are ready',
  dependsOn: 'metadata',

  async processChunk(fullInput, itemIndices, deps) {
    // Process chunk
    return results;
  },

  /**
   * Generator function that yields results incrementally
   */
  async *generate(input, options) {
    const { worker } = options;

    // Stream results as workers complete chunks
    for await (const chunkResult of worker.stream(input, input, {})) {
      // Yield immediately - downstream can start processing
      yield chunkResult;
    }
  },
};
```

### Benefits of Streaming

- **Reduced memory usage** - Process data in chunks
- **Earlier downstream starts** - Next generator can begin before this one finishes
- **Better parallelism** - Multiple generators can work simultaneously

### Non-Streaming Generators

Some generators must collect all input before processing:

```javascript
export default {
  name: 'batch-generator',
  version: '1.0.0',
  description: 'Requires all input at once',
  dependsOn: 'jsx-ast',

  /**
   * Non-streaming - returns Promise instead of AsyncGenerator
   */
  async generate(input, options) {
    // Collect all input (if dependency is streaming, this waits for completion)
    const allData = await collectAll(input);

    // Process everything together
    const result = processBatch(allData);

    return result;
  },
};
```

Use non-streaming when:

- You need all data to make decisions (e.g., code splitting, global analysis)
- Output format requires complete dataset
- Cross-references between items need resolution

## Generator Dependencies

### Declaring Dependencies

```javascript
export default {
  name: 'my-generator',
  dependsOn: 'metadata', // This generator requires metadata output

  async generate(input, options) {
    // input contains the output from 'metadata' generator
  },
};
```

### Dependency Chain Example

```javascript
// Step 1: Parse markdown to AST
export default {
  name: 'ast',
  dependsOn: undefined,  // No dependency
  // Processes raw markdown files
};

// Step 2: Extract metadata from AST
export default {
  name: 'metadata',
  dependsOn: 'ast',  // Depends on AST
  // Processes AST output
};

// Step 3: Generate HTML from metadata
export default {
  name: 'html-generator',
  dependsOn: 'metadata',  // Depends on metadata
  // Processes metadata output
};
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
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async generate(input, options) {
  const { output } = options;

  if (!output) {
    // Return data without writing
    return result;
  }

  // Ensure directory exists
  await mkdir(output, { recursive: true });

  // Write single file
  await writeFile(
    join(output, 'output.txt'),
    content,
    'utf-8'
  );

  // Write multiple files
  for (const item of items) {
    await writeFile(
      join(output, `${item.name}.txt`),
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

async generate(input, options) {
  const { output } = options;

  if (output) {
    // Copy asset directory
    await cp(
      new URL('./assets', import.meta.url),
      join(output, 'assets'),
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
