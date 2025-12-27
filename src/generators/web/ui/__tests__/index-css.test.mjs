import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

describe('web/ui/index.css', () => {
  it('contains selector to hide empty hashed navItems container', async () => {
    const cssPath = join(import.meta.dirname, '..', 'index.css');
    const css = await readFile(cssPath, 'utf-8');
    assert.ok(css.includes('div[class$="_navItems"]:empty'));
  });
});
