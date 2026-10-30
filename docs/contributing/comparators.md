# Adding a comparator

A comparator is a small Node.js script that compares one generator's output on
`main` with its output on a pull request and prints a Markdown report. CI
collects these reports into a comment on the pull request, so you and the
reviewers can see what a change does to the generated docs, and to generation
time and memory, before it lands.

Comparators live in `scripts/comparators/` and run only in this repository's
CI. They are not part of any published package.

## How the comparison runs

Two workflows work together:

1. `.github/workflows/generate.yml` ("Generate and Compare Docs") runs on every
   push to `main`. It records the latest nodejs/node commit, generates every
   target in its matrix from that commit's docs, and uploads each target's
   output directory as an artifact named after the target.
2. On a pull request, the same workflow finds the `main` run for the pull
   request's base commit and reuses its Node.js commit. Both sides are built
   from the same sources, so any difference comes from the pull request.
3. Each matrix entry generates into `out/`. Those with a `compare` field then
   download the target's artifact from the `main` run into `base/` and run
   `node scripts/comparators/<compare>.mjs > out/comparison.txt`.
4. When the workflow finishes, `.github/workflows/leave-comment.yml` joins
   every `comparison.txt` and posts the result as a single comment on the pull
   request (tagged `compared`, so later pushes update it). If every report is
   empty, it posts nothing.

Each generation runs under `/usr/bin/time`, which writes `out/benchmark.json`
with the elapsed time, user and system CPU time, and peak resident memory.
Comparators read it for their performance section and leave it out of the
output comparison.

Matrix entries without `compare` (at the moment `man-page`, `addon-verify` and
`json-simple`) are generated and uploaded, but not compared.

## Built-in comparators

| Comparator         | What it reports                                                                                                    | Used by                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file-size`        | Files added, removed or changed in size, largest change first, with the net change, in a collapsible table         | [`html`](../generators/html.md), [`orama-db`](../generators/orama-db.md), [`llms-txt`](../generators/llms-txt.md), [`legacy-html`](../generators/legacy-html.md) |
| `object-assertion` | Files added or removed, and an `assert.deepStrictEqual` diff for each file whose parsed JSON differs, one per file | [`json`](../generators/json.md), [`api-links`](../generators/api-links.md), [`legacy-json`](../generators/legacy-json.md)                                        |

Both end with a **Performance estimate** section: the generation time and peak
memory of each side, read from `benchmark.json`. It comes from a single CI run,
so treat it as a rough signal. It's left out when either side has no
`benchmark.json`.

Keep their limits in mind when you pick one:

- `file-size` compares sizes only. An edit that keeps a file's size the same
  doesn't show up.
- `object-assertion` parses every output file as JSON, so it only suits
  generators whose output is all JSON.

## Shared helpers

| Import                              | From                                  | What it gives you                                                                                                                                                              |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BASE`, `HEAD`                      | `scripts/constants.mjs`               | The two build directories: `base/` and `out/` at the repository root (both gitignored), unless the `BASE` and `HEAD` environment variables point elsewhere.                    |
| `TITLE`                             | `scripts/constants.mjs`               | The report heading, ``## `<GENERATOR>` Generator``, built from the `GENERATOR` environment variable, which CI sets to the target name. Set the `TITLE` variable to replace it. |
| `BENCHMARK_FILE`, `COMPARISON_FILE` | `scripts/constants.mjs`               | The metadata file names, `benchmark.json` and `comparison.txt`.                                                                                                                |
| `listOutputFiles(directory)`        | `scripts/comparators/files.mjs`       | Every file under `directory`, recursively, as sorted relative paths, without the two metadata files.                                                                           |
| `comparePerformance()`              | `scripts/comparators/performance.mjs` | The performance section as Markdown, or an empty string when either side has no `benchmark.json`. It throws if a benchmark value isn't a finite number.                        |

## Writing a comparator

A comparator is an ES module in `scripts/comparators/`. Its file name without
`.mjs` is the value of the `compare` field in the workflow matrix. It should:

- Read the two builds from `BASE` and `HEAD`, listing their files with
  `listOutputFiles`, which skips `benchmark.json` and the `comparison.txt`
  that the report is being written to.
- Print Markdown to standard output, starting with `TITLE`, and print nothing
  when there's nothing to report.
- Report differences instead of failing on them. A comparator that exits with
  an error fails the CI job, so throw only when something is actually broken.
- End with `comparePerformance()`, like the built-in comparators, so the
  timing stays visible.

### Create the script

This example lists every file whose bytes changed, which catches the
same-size edits that `file-size` misses:

```mjs displayName="scripts/comparators/changed-files.mjs"
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BASE, HEAD, TITLE } from '../constants.mjs';
import { listOutputFiles } from './files.mjs';
import { comparePerformance } from './performance.mjs';

const [baseFiles, headFiles] = await Promise.all(
  [BASE, HEAD].map(directory => listOutputFiles(directory))
);
const baseSet = new Set(baseFiles);
const headSet = new Set(headFiles);

const describe = async file => {
  if (!baseSet.has(file)) {
    return `- \`${file}\` added`;
  }

  if (!headSet.has(file)) {
    return `- \`${file}\` removed`;
  }

  const [base, head] = await Promise.all(
    [BASE, HEAD].map(directory => readFile(join(directory, file)))
  );

  return base.equals(head) ? null : `- \`${file}\` changed`;
};

const files = [...new Set([...baseFiles, ...headFiles])].sort();
const changes = (await Promise.all(files.map(describe))).filter(Boolean);

const sections = [];

if (changes.length) {
  sections.push(
    `**Output:** ${changes.length} ${changes.length === 1 ? 'file differs' : 'files differ'}`,
    changes.join('\n')
  );
}

const performance = await comparePerformance();

if (performance) {
  sections.push(performance);
}

if (sections.length) {
  console.log(`${TITLE}\n\n${sections.join('\n\n')}\n`);
}
```

### Run it locally

Build the same target from `main` into `base/` and from your branch into
`out/`, with the same Node.js checkout for both (see [Running the tool
locally](https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md#running-the-tool-locally)
for a sparse checkout of the Node.js docs), then run the script:

```bash
git switch main
node packages/cli/bin/cli.mjs generate -t man-page -i ../node/doc/api/cli.md -o base

git switch my-branch
node packages/cli/bin/cli.mjs generate -t man-page -i ../node/doc/api/cli.md -o out

GENERATOR=man-page node scripts/comparators/changed-files.mjs
```

Local builds have no `benchmark.json`, so the report has no performance
section.

### Add a test

Comparator tests live in `scripts/__tests__/comparators.test.mjs` and run with
`node --run test`. The file's `createDirectories` helper creates temporary base
and head directories, and `runComparator` runs a comparator against them as a
child process with `GENERATOR=test`:

```mjs displayName="scripts/__tests__/comparators.test.mjs"
test('changed-files comparator reports same-size edits', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeFile(path.join(base, 'node.1'), 'base', 'utf8'),
    writeFile(path.join(head, 'node.1'), 'head', 'utf8'),
  ]);

  const result = await runComparator('changed-files', base, head);

  assert.match(result, /## `test` Generator/);
  assert.match(result, /`node\.1` changed/);
});
```

### Turn it on in CI

Set `compare` on the matrix entries in `.github/workflows/generate.yml` that
should use it. For example, to compare the man page:

```yaml displayName=".github/workflows/generate.yml"
- target: man-page
  input: './node/doc/api/cli.md'
  compare: changed-files
```

The compare step runs in the pull request's own checkout, so the pull request
that adds a comparator already uses it. The base side is the target's artifact
from the `main` run, which every matrix entry uploads whether or not it's
compared.

A target that isn't in the matrix on `main` yet has no artifact there, so its
download step fails. Add its matrix entry without `compare` first, and turn
comparison on in a later pull request.
