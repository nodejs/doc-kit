import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { comparePerformance } from '../../scripts/comparators/performance.mjs';

const benchmark = {
  elapsedSeconds: 2,
  userCpuSeconds: 1,
  systemCpuSeconds: 0.5,
  maxRssKiB: 1024,
};

const executeFile = promisify(execFile);
const comparatorDirectory = fileURLToPath(
  new URL('../../scripts/comparators/', import.meta.url)
);

const createDirectories = async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'doc-kit-'));
  const base = path.join(root, 'base');
  const head = path.join(root, 'head');

  await Promise.all([
    mkdir(base, { recursive: true }),
    mkdir(head, { recursive: true }),
  ]);
  t.after(() => rm(root, { recursive: true, force: true }));

  return { base, head };
};

const writeBenchmark = (directory, value = benchmark) =>
  writeFile(
    path.join(directory, 'benchmark.json'),
    JSON.stringify(value),
    'utf8'
  );

const runComparator = async (name, base, head) => {
  const { stdout } = await executeFile(
    process.execPath,
    [path.join(comparatorDirectory, `${name}.mjs`)],
    {
      env: { ...process.env, BASE: base, HEAD: head, GENERATOR: 'test' },
    }
  );

  return stdout;
};

test('comparePerformance summarizes benchmark differences', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeBenchmark(base),
    writeBenchmark(head, {
      elapsedSeconds: 3,
      userCpuSeconds: 0.75,
      systemCpuSeconds: 0.5,
      maxRssKiB: 1536,
    }),
  ]);

  const result = await comparePerformance(base, head);

  assert.match(
    result,
    /\*\*Generation time:\*\* 50\.0% slower \(2\.00 s → 3\.00 s\)/
  );
  assert.match(
    result,
    /\*\*Peak memory:\*\* 50\.0% higher \(1\.00 MB → 1\.50 MB\)/
  );
  assert.match(result, /single CI run/);
  assert.doesNotMatch(result, /CPU time/);
});

test('comparePerformance omits results when an artifact has no benchmark', async t => {
  const { base, head } = await createDirectories(t);

  await writeBenchmark(head);

  assert.equal(await comparePerformance(base, head), '');
});

test('comparePerformance rejects invalid benchmark values', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeBenchmark(base),
    writeBenchmark(head, { ...benchmark, maxRssKiB: undefined }),
  ]);

  await assert.rejects(
    comparePerformance(base, head),
    /Invalid peak memory benchmark value/
  );
});

test('file-size comparator combines output and performance results', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeFile(path.join(base, 'result.txt'), 'base', 'utf8'),
    writeFile(path.join(head, 'result.txt'), 'a larger result', 'utf8'),
    writeBenchmark(base),
    writeBenchmark(head, { ...benchmark, elapsedSeconds: 3 }),
  ]);

  const result = await runComparator('file-size', base, head);

  assert.equal(result.match(/## `test` Generator/g)?.length, 1);
  assert.match(result, /Output size:.*1 file changed · net \+11\.00 B/);
  assert.match(result, /<summary>File size details<\/summary>/);
  assert.match(
    result,
    /\| File \| Main \| PR \| Change \|\n\| --- \| ---: \| ---: \| ---: \|/
  );
  assert.match(result, /`result\.txt`/);
  assert.match(result, /Performance estimate/);
  assert.doesNotMatch(result, /benchmark\.json/);
});

test('object comparator treats benchmark data as metadata', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeFile(path.join(base, 'result.json'), '{"value":true}', 'utf8'),
    writeFile(path.join(head, 'result.json'), '{"value":true}', 'utf8'),
    writeBenchmark(base),
    writeBenchmark(head, { ...benchmark, maxRssKiB: 2048 }),
  ]);

  const result = await runComparator('object-assertion', base, head);

  assert.equal(result.match(/## `test` Generator/g)?.length, 1);
  assert.doesNotMatch(result, /\*\*Output:/);
  assert.match(result, /Performance estimate/);
  assert.doesNotMatch(result, /benchmark\.json/);
});

test('comparators report added and removed output files', async t => {
  const { base, head } = await createDirectories(t);
  const baseOutput = path.join(base, 'generator');
  const headOutput = path.join(head, 'generator');

  await Promise.all([mkdir(baseOutput), mkdir(headOutput)]);
  await Promise.all([
    writeFile(path.join(baseOutput, 'removed.json'), '{"old":true}', 'utf8'),
    writeFile(path.join(headOutput, 'added.json'), '{"new":true}', 'utf8'),
    writeFile(path.join(head, 'comparison.txt'), '', 'utf8'),
  ]);

  const [sizes, objects] = await Promise.all([
    runComparator('file-size', base, head),
    runComparator('object-assertion', base, head),
  ]);

  assert.match(sizes, /2 files changed/);
  assert.match(sizes, /`generator\/added\.json` \| — \| 12\.00 B/);
  assert.match(sizes, /`generator\/removed\.json` \| 12\.00 B \| —/);
  assert.match(objects, /`generator\/added\.json` added/);
  assert.match(objects, /`generator\/removed\.json` removed/);
  assert.doesNotMatch(sizes, /comparison\.txt|4\.00 KB/);
  assert.doesNotMatch(objects, /comparison\.txt/);
});
