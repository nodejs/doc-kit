// Measures what `--experimental-incremental` saves. Each run builds a copy of
// the input four times: without the option, with it into an empty directory,
// again with nothing changed, and again after editing one document. Prints the
// median of each.
//
//   node scripts/benchmark-incremental.mjs -i "node/doc/api/*.md" \
//     [-t html -t json] [--runs 3] [-- <other `generate` arguments>]

import { spawnSync } from 'node:child_process';
import { appendFile, cp, glob, mkdtempDisposable, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { parseArgs } from 'node:util';

const CLI = join(
  import.meta.dirname,
  '..',
  'packages',
  'cli',
  'bin',
  'cli.mjs'
);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    input: { type: 'string', short: 'i' },
    target: { type: 'string', short: 't', multiple: true, default: ['html'] },
    runs: { type: 'string', default: '3' },
  },
});

if (!values.input) {
  throw new Error('Pass the documents to build with -i "<glob>"');
}

const median = numbers => {
  const sorted = numbers.toSorted((a, b) => a - b);
  const middle = sorted.length >> 1;

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Removed when the script exits
await using temporary = await mkdtempDisposable(
  join(tmpdir(), 'doc-kit-benchmark-incremental-')
);

const root = temporary.path;
const docs = join(root, 'docs');

// Copied, so editing a document doesn't touch the input
const documents = [];

for await (const file of glob(values.input)) {
  documents.push(join(docs, basename(file)));

  await cp(file, documents.at(-1));
}

/**
 * Times one build into the output, in seconds.
 *
 * @param {string} output
 * @param {Array<string>} [flags]
 */
const build = (output, flags = []) => {
  const start = performance.now();

  const { status, stderr } = spawnSync(
    process.execPath,
    [
      CLI,
      'generate',
      ...values.target.flatMap(target => ['-t', target]),
      ...['-i', join(docs, '*.md')],
      ...['-o', output],
      ...['--log-level', 'error'],
      ...flags,
      ...positionals,
    ],
    { encoding: 'utf-8' }
  );

  if (status !== 0) {
    throw new Error(`generate failed:\n${stderr}`);
  }

  return (performance.now() - start) / 1000;
};

const times = { full: [], first: [], unchanged: [], edited: [] };

for (let run = 0; run < Number(values.runs); run++) {
  const full = join(root, `full-${run}`);
  const incremental = join(root, `incremental-${run}`);

  times.full.push(build(full));
  times.first.push(build(incremental, ['--experimental-incremental']));
  times.unchanged.push(build(incremental, ['--experimental-incremental']));

  await appendFile(documents[0], `\nBenchmark edit ${run}.\n`);

  times.edited.push(build(incremental, ['--experimental-incremental']));

  await rm(full, { recursive: true });
  await rm(incremental, { recursive: true });
}

console.log(
  `${documents.length} documents, -t ${values.target.join(' -t ')}, median of ${values.runs} runs`
);

console.table({
  'without the option': { seconds: median(times.full).toFixed(2) },
  'first incremental build': { seconds: median(times.first).toFixed(2) },
  'nothing changed': { seconds: median(times.unchanged).toFixed(2) },
  'one document edited': { seconds: median(times.edited).toFixed(2) },
});
