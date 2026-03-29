import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { processEntry } from '../buildContent.mjs';

describe('processEntry', () => {
  it('does not throw when tags are missing', () => {
    const entry = {
      content: {
        type: 'root',
        children: [],
      },
    };

    assert.doesNotThrow(() =>
      processEntry(entry, null, [
        {
          api: 'fs',
          name: 'File system',
          stabilityIndex: 2,
          stabilityDescription: 'Stable',
        },
      ])
    );
  });
});
