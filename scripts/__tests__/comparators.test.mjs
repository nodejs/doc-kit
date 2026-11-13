import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);
const comparatorDirectory = fileURLToPath(
  new URL('../comparators/', import.meta.url)
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

test('file-size comparator reports output changes', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeFile(path.join(base, 'result.txt'), 'base', 'utf8'),
    writeFile(path.join(head, 'result.txt'), 'a larger result', 'utf8'),
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
});

test('object comparator is silent when output matches', async t => {
  const { base, head } = await createDirectories(t);

  await Promise.all([
    writeFile(path.join(base, 'result.json'), '{"value":true}', 'utf8'),
    writeFile(path.join(head, 'result.json'), '{"value":true}', 'utf8'),
  ]);

  const result = await runComparator('object-assertion', base, head);

  assert.equal(result, '');
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
  const added = `generator${path.sep}added.json`;
  const removed = `generator${path.sep}removed.json`;
  const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  assert.match(
    sizes,
    new RegExp(`\`${escapeRegExp(added)}\` \\| — \\| 12\\.00 B`)
  );
  assert.match(
    sizes,
    new RegExp(`\`${escapeRegExp(removed)}\` \\| 12\\.00 B \\| —`)
  );
  assert.match(objects, new RegExp(`\`${escapeRegExp(added)}\` added`));
  assert.match(objects, new RegExp(`\`${escapeRegExp(removed)}\` removed`));
  assert.doesNotMatch(sizes, /comparison\.txt|4\.00 KB/);
  assert.doesNotMatch(objects, /comparison\.txt/);
});
