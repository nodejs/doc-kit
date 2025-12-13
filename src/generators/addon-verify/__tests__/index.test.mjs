import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { u } from 'unist-builder';

import addon from '../index.mjs';
import {
  normalizeSectionName,
  generateSectionFolderName,
} from '../utils/section.mjs';

test('returns empty array when no code blocks match filename comment', async () => {
  const entry = {
    heading: { data: { name: 'Section A' } },
    content: u('root', [u('code', 'console.log("no filename header");')]),
  };

  const result = await addon.generate([entry], {});

  // No sections were buildable / no filenames extracted
  assert.deepEqual(result, []);
});

test('ignores non-buildable sections (needs both .cc and .js)', async () => {
  // Only a .cc file present -> not buildable
  const entry = {
    heading: { data: { name: 'OnlyCC' } },
    content: u('root', [u('code', '// file1.cc\nint main() {}')]),
  };

  const result = await addon.generate([entry], {});

  assert.deepEqual(result, []);
});

test('generates files array and writes files to disk when output provided', async () => {
  const sectionName = 'My Addon Section';

  const entry = {
    heading: { data: { name: sectionName } },
    content: u('root', [
      u('code', '// file1.cc\nint main() {}'),
      u(
        'code',
        "// test.js\nmodule.exports = require('./build/Release/addon');"
      ),
    ]),
  };

  const tmp = await mkdtemp(join(tmpdir(), 'doc-kit-'));

  const returned = await addon.generate([entry], { output: tmp });

  // Returned is an array of file arrays (one per section)
  assert.equal(Array.isArray(returned), true);
  assert.equal(returned.length, 1);

  const files = returned[0];

  assert.ok(files.some(f => f.name === 'file1.cc'));
  assert.ok(files.some(f => f.name === 'test.js'));
  assert.ok(files.some(f => f.name === 'binding.gyp'));

  // Verify files were written to disk under the computed folder name
  const folderName = generateSectionFolderName(
    normalizeSectionName(sectionName),
    0
  );

  const file1 = await readFile(join(tmp, folderName, 'file1.cc'), 'utf-8');
  const binding = await readFile(join(tmp, folderName, 'binding.gyp'), 'utf-8');

  assert.match(file1, /int main/);
  assert.match(binding, /targets/);
});
