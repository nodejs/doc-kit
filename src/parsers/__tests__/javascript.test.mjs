import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseJsSource } from '../javascript.mjs';

describe('parsers/javascript', () => {
  it('parseJsSource throws on non-string value', async () => {
    await assert.rejects(() => parseJsSource({ value: 1 }));
  });

  it('parseJsSource returns path on success', async () => {
    const res = await parseJsSource({ value: 'return 1;', path: 'p' });
    assert.equal(res.path, 'p');
  });
});
