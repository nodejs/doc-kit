import { strict as assert } from 'node:assert';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

import cssLoader from '../css.mjs';

// Create a temporary directory for test files
const testDir = join(tmpdir(), `css-test-${Date.now()}`);

before(async () => {
  await mkdir(testDir, { recursive: true });
});

after(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test('cssLoader - plugin has required properties', () => {
  const plugin = cssLoader();

  assert.equal(plugin.name, 'css-loader');
  assert.ok(plugin.load);
  assert.ok(plugin.load.handler);
  assert.ok(plugin.load.filter);
  assert.ok(plugin.buildEnd);
});

test('cssLoader - filter matches .module.css files', () => {
  const plugin = cssLoader();
  const { filter } = plugin.load;

  assert.ok(filter.id.include.test('/path/to/styles.module.css'));
  assert.ok(filter.id.include.test('component.module.css'));
  assert.ok(!filter.id.include.test('styles.css'));
  assert.ok(!filter.id.include.test('styles.module.scss'));
});

test('cssLoader - processes CSS module file', async () => {
  const plugin = cssLoader();
  const testFile = join(testDir, 'test.module.css');

  // Write a simple CSS module file
  await writeFile(
    testFile,
    `.button {
  color: blue;
  background: white;
}
.container {
  padding: 10px;
}`
  );

  const result = await plugin.load.handler(testFile);

  // Should return JS module with exports
  assert.ok(result.code);
  assert.equal(result.moduleType, 'js');

  // Parse the exported default object
  const exportMatch = result.code.match(/export default (.+);/);
  assert.ok(exportMatch, 'Should export an object');

  const exports = JSON.parse(exportMatch[1]);
  assert.ok(exports.button, 'Should have button class');
  assert.ok(exports.container, 'Should have container class');

  // Scoped names should not be the original names
  assert.notEqual(exports.button, 'button');
  assert.notEqual(exports.container, 'container');
});

test('cssLoader - caches processed files', async () => {
  const plugin = cssLoader();
  const testFile = join(testDir, 'cached.module.css');

  await writeFile(testFile, '.test { color: red; }');

  // First call
  const result1 = await plugin.load.handler(testFile);

  // Second call (should hit cache)
  const result2 = await plugin.load.handler(testFile);

  // Both results should be identical
  assert.equal(result1.code, result2.code);
  assert.equal(result1.moduleType, result2.moduleType);
});

test('cssLoader - collects CSS chunks', async () => {
  const plugin = cssLoader();
  const testFile1 = join(testDir, 'chunk1.module.css');
  const testFile2 = join(testDir, 'chunk2.module.css');

  await writeFile(testFile1, '.class1 { color: red; }');
  await writeFile(testFile2, '.class2 { color: blue; }');

  // Process both files
  await plugin.load.handler(testFile1);
  await plugin.load.handler(testFile2);

  // Mock emitFile to capture output
  const emittedFiles = [];
  const mockContext = {
    emitFile(file) {
      emittedFiles.push(file);
    },
  };

  // Call buildEnd with mock context
  plugin.buildEnd.call(mockContext);

  // Should emit one CSS file
  assert.equal(emittedFiles.length, 1);
  assert.equal(emittedFiles[0].type, 'asset');
  assert.equal(emittedFiles[0].name, 'styles.css');

  // CSS should contain both classes (with scoped names)
  const cssContent = emittedFiles[0].source;
  assert.ok(typeof cssContent === 'string');
  assert.ok(cssContent.length > 0);
});

test('cssLoader - handles multiple CSS modules with different class names', async () => {
  const plugin = cssLoader();
  const testFile1 = join(testDir, 'buttons.module.css');
  const testFile2 = join(testDir, 'layout.module.css');

  await writeFile(
    testFile1,
    `.primary { background: blue; }
.secondary { background: gray; }`
  );

  await writeFile(
    testFile2,
    `.header { height: 60px; }
.footer { height: 40px; }`
  );

  const result1 = await plugin.load.handler(testFile1);
  const result2 = await plugin.load.handler(testFile2);

  // Parse exports from both modules
  const exports1 = JSON.parse(result1.code.match(/export default (.+);/)[1]);
  const exports2 = JSON.parse(result2.code.match(/export default (.+);/)[1]);

  // Each should have their own classes
  assert.ok(exports1.primary);
  assert.ok(exports1.secondary);
  assert.ok(exports2.header);
  assert.ok(exports2.footer);

  // Classes from different files should not overlap
  assert.ok(!exports1.header);
  assert.ok(!exports2.primary);
});

test('cssLoader - buildEnd skips emitting when no CSS processed', () => {
  const plugin = cssLoader();

  const emittedFiles = [];
  const mockContext = {
    emitFile(file) {
      emittedFiles.push(file);
    },
  };

  // Call buildEnd without processing any CSS files
  plugin.buildEnd.call(mockContext);

  // Should not emit anything
  assert.equal(emittedFiles.length, 0);
});

test('cssLoader - handles CSS with pseudo-selectors', async () => {
  const plugin = cssLoader();
  const testFile = join(testDir, 'pseudo.module.css');

  await writeFile(
    testFile,
    `.button:hover {
  color: red;
}
.button:active {
  color: darkred;
}`
  );

  const result = await plugin.load.handler(testFile);
  const exports = JSON.parse(result.code.match(/export default (.+);/)[1]);

  assert.ok(exports.button);
});

test('cssLoader - processes CSS with multiple classes on same element', async () => {
  const plugin = cssLoader();
  const testFile = join(testDir, 'multi.module.css');

  await writeFile(
    testFile,
    `.btn { padding: 10px; }
.btnPrimary { background: blue; }
.btnSecondary { background: gray; }`
  );

  const result = await plugin.load.handler(testFile);
  const exports = JSON.parse(result.code.match(/export default (.+);/)[1]);

  assert.ok(exports.btn);
  assert.ok(exports.btnPrimary);
  assert.ok(exports.btnSecondary);
});

test('cssLoader - separate plugin instances have separate caches', async () => {
  const plugin1 = cssLoader();
  const plugin2 = cssLoader();

  const testFile = join(testDir, 'separate.module.css');
  await writeFile(testFile, '.test { color: green; }');

  await plugin1.load.handler(testFile);

  // Mock emitFile for both plugins
  const emitted1 = [];
  const emitted2 = [];

  plugin1.buildEnd.call({
    emitFile(file) {
      emitted1.push(file);
    },
  });

  plugin2.buildEnd.call({
    emitFile(file) {
      emitted2.push(file);
    },
  });

  // Plugin 1 should emit CSS, plugin 2 should not (separate chunk tracking)
  assert.equal(emitted1.length, 1);
  assert.equal(emitted2.length, 0);
});
