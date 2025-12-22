import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import cssPlugin from '../css.mjs';

describe('generators/web/utils - css', () => {
  it('css plugin buildEnd is a no-op when no chunks processed', () => {
    const plugin = cssPlugin();

    let emitted = null;
    const thisArg = { emitFile: info => (emitted = info) };

    // Should not throw and should not emit anything
    plugin.buildEnd.call(thisArg);
    assert.equal(emitted, null);
  });

  it('css plugin processes .module.css files and emits styles.css asset', async () => {
    const plugin = cssPlugin();

    // create temp .module.css file
    const { writeFile, unlink } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const id = join(
      tmpdir(),
      `doc-kit-test-${Date.now()}-${Math.random()}.module.css`
    );
    await writeFile(id, '.btn { color: red; }', 'utf8');

    // Call the handler to process the css file
    const { handler } = plugin.load;
    const result = await handler(id);

    // Should return a JS module exporting the mapped class names
    assert.match(result.code, /export default/);
    assert.match(result.code, /"btn"/);

    // buildEnd should emit a styles.css asset containing the compiled CSS
    let emitted = null;
    const thisArg = { emitFile: info => (emitted = info) };
    plugin.buildEnd.call(thisArg);

    assert.ok(emitted, 'expected styles.css to be emitted');
    assert.equal(emitted.name, 'styles.css');
    assert.match(String(emitted.source), /color:\s*red/);

    // cleanup
    await unlink(id);
  });
});
