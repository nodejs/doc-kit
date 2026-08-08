import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDisplayedTheme } from '../theme.mjs';

describe('getDisplayedTheme', () => {
  it('uses the resolved system scheme for the initial system preference', () => {
    assert.strictEqual(getDisplayedTheme('system', true), 'dark');
    assert.strictEqual(getDisplayedTheme('system', false), 'light');
  });

  it('preserves explicit user preferences', () => {
    assert.strictEqual(getDisplayedTheme('dark', false), 'dark');
    assert.strictEqual(getDisplayedTheme('light', true), 'light');
  });
});
