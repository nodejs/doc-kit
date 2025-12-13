import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import llms from '../index.mjs';

const makeEntry = ({
  title = 'MyAPI',
  depth = 1,
  desc = 'A description',
  api = 'doc/some/path.md',
  llm_description,
} = {}) => ({
  heading: { depth, data: { name: title } },
  content: {
    children: [
      { type: 'paragraph', children: [{ type: 'text', value: desc }] },
    ],
  },
  api_doc_source: api,
  llm_description,
});

test('generate returns filled template including depth 1 entries', async () => {
  const entry = makeEntry({ title: 'Alpha', desc: 'Alpha description' });

  const result = await llms.generate([entry], {});

  assert.equal(typeof result, 'string');
  assert.match(result, /- \[Alpha\]/);
  assert.match(result, /Alpha description/);
});

test('generate only includes depth 1 headings', async () => {
  const entry1 = makeEntry({ title: 'Top', depth: 1, desc: 'Top desc' });
  const entry2 = makeEntry({ title: 'Sub', depth: 2, desc: 'Sub desc' });

  const result = await llms.generate([entry1, entry2], {});

  assert.match(result, /- \[Top\]/);
  assert.doesNotMatch(result, /- \[Sub\]/);
});

test('generate writes llms.txt when output is provided', async () => {
  const entry = makeEntry({ title: 'WriteTest', desc: 'Write description' });

  const tmp = await mkdtemp(join(tmpdir(), 'doc-kit-'));

  const returned = await llms.generate([entry], { output: tmp });

  const file = await readFile(join(tmp, 'llms.txt'), 'utf-8');

  assert.equal(returned, file);
  assert.match(file, /- \[WriteTest\]/);
  assert.match(file, /Write description/);
});
