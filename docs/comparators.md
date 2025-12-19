# Creating Comparators

This guide explains how to create build comparison scripts for `@nodejs/doc-kit`. Comparators help identify differences between documentation builds, useful for CI/CD and regression testing.

## Comparator Concepts

Comparators are scripts that:

1. **Compare** generated documentation between two builds (base vs. head)
2. **Identify differences** in content, structure, or file size
3. **Report results** in a format suitable for CI/CD systems
4. **Help catch regressions** before merging changes

### When to Use Comparators

- **Verify backward compatibility** - Ensure new code produces same output
- **Track file size changes** - Monitor bundle size growth
- **Validate transformations** - Check that refactors don't alter output
- **Debug generation issues** - Understand what changed between versions

## Comparator Structure

Comparators are standalone ESM scripts located in `scripts/compare-builds/`:

```
scripts/compare-builds/
├── utils.mjs           # Shared utilities (BASE, HEAD paths)
├── legacy-json.mjs     # Compare legacy JSON output
├── web.mjs             # Compare web bundle sizes
└── your-comparator.mjs # Your new comparator
```

### Naming Convention

**Each comparator must have the same name as the generator it compares.** For example:

- `web.mjs` compares output from the `web` generator
- `legacy-json.mjs` compares output from the `legacy-json` generator
- `my-format.mjs` would compare output from a `my-format` generator

## Creating a Comparator

### Step 1: Create the Comparator File

Create a new file in `scripts/compare-builds/` with the same name as your generator:

```javascript
// scripts/compare-builds/my-format.mjs
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE, HEAD } from './utils.mjs';

// Fetch files from both directories
const [baseFiles, headFiles] = await Promise.all([BASE, HEAD].map(() => await readdir(dir)));

// Find all unique files across both builds
const allFiles = [...new Set([...baseFiles, ...headFiles])];

/**
 * Compare a single file between base and head
 * @param {string} file - Filename to compare
 * @returns {Promise<Object|null>} Difference object or null if identical
 */
const compareFile = async file => {
  const basePath = join(BASE, file);
  const headPath = join(HEAD, file);

  try {
    const baseContent = await readFile(basePath, 'utf-8');
    const headContent = await readFile(headPath, 'utf-8');

    if (baseContent !== headContent) {
      return {
        file,
        type: 'modified',
        baseSize: baseContent.length,
        headSize: headContent.length,
      };
    }

    return null;
  } catch (error) {
    // File missing in one of the builds
    const exists = await Promise.all([
      readFile(basePath, 'utf-8').then(() => true).catch(() => false),
      readFile(headPath, 'utf-8').then(() => true).catch(() => false),
    ]);

    if (exists[0] && !exists[1]) {
      return { file, type: 'removed' };
    }
    if (!exists[0] && exists[1]) {
      return { file, type: 'added' };
    }

    return { file, type: 'error', error: error.message };
  }
};

// Compare all files in parallel
const results = await Promise.all(allFiles.map(compareFile));

// Filter out null results (identical files)
const differences = results.filter(Boolean);

// Output markdown results
if (differences.length > 0) {
  console.log('## `my-format` Generator');
  console.log('');
  console.log(`Found ${differences.length} difference(s):`);
  console.log('');

  // Group by type
  const added = differences.filter(d => d.type === 'added');
  const removed = differences.filter(d => d.type === 'removed');
  const modified = differences.filter(d => d.type === 'modified');

  if (added.length) {
    console.log('### Added Files');
    console.log('');
    added.forEach(d => console.log(`- \`${d.file}\``));
    console.log('');
  }

  if (removed.length) {
    console.log('### Removed Files');
    console.log('');
    removed.forEach(d => console.log(`- \`${d.file}\``));
    console.log('');
  }

  if (modified.length) {
    console.log('### Modified Files');
    console.log('');
    console.log('| File | Base Size | Head Size | Diff |');
    console.log('|-|-|-|-|');
    modified.forEach(({ file, baseSize, headSize }) => {
      const diff = headSize - baseSize;
      const sign = diff > 0 ? '+' : '';
      console.log(`| \`${file}\` | ${baseSize} | ${headSize} | ${sign}${diff} |`);
    });
    console.log('');
  }
}
```

### Step 2: Test Locally

Run your comparator locally to verify it works:

```bash
# Set up BASE and HEAD directories
export BASE=path/to/base/output
export HEAD=path/to/head/output

# Run the comparator
node scripts/compare-builds/my-format.mjs
```

### Step 3: Integrate with CI/CD

The comparator will automatically run in GitHub Actions when:

1. Your generator is configured with `compare: true` in the workflow
2. The comparator filename matches the generator name
