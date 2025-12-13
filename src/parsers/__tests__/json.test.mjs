import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { parseTypeMap } from '../json.mjs';

describe('parsers/json', () => {
  it('parseTypeMap returns empty for empty path', async () => {
    const obj = await parseTypeMap('');
    assert.deepEqual(obj, {});
  });

  it('parseTypeMap parses a JSON file', async () => {
    const tmp = await mkdtemp(join(os.tmpdir(), 'doc-kit-'));
    const file = join(tmp, 'map.json');
    await writeFile(file, JSON.stringify({ a: 'b' }));
    const parsed = await parseTypeMap(file);
    assert.deepEqual(parsed, { a: 'b' });
  });
});
