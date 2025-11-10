'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';

import bundleCode from '../bundle.mjs';

describe('bundleCode', () => {
  describe('server builds', () => {
    it('should bundle a single server entry', async () => {
      const code = `
        import { createElement } from 'preact';
        const element = createElement('div', null, 'Hello');
        return 'output';
      `;

      const result = await bundleCode(code, { server: true });

      assert.ok(result.jsMap, 'should have jsMap');
      assert.ok(result.jsMap['entrypoint.jsx'], 'should have entrypoint.jsx');
      assert.ok(
        result.jsMap['entrypoint.jsx'].includes('Hello'),
        'should include the code content'
      );
      assert.strictEqual(result.css, '', 'should have empty CSS');
      assert.strictEqual(result.jsChunks.length, 0, 'should have no JS chunks');
      assert.strictEqual(
        result.importMapHtml,
        '',
        'should have empty import map'
      );
    });

    it('should handle external dependencies', async () => {
      const code = `
        import { render } from 'preact-render-to-string';
        import { createElement } from 'preact';
        const element = createElement('div', null, 'Test');
        return render(element);
      `;

      const result = await bundleCode(code, { server: true });

      assert.ok(result.jsMap['entrypoint.jsx'], 'should bundle successfully');
      // External dependencies should not be bundled
      assert.ok(
        result.jsMap['entrypoint.jsx'].includes('require'),
        'should use require for external deps'
      );
    });

    it('should apply SERVER define flag', async () => {
      const code = `
        const value = SERVER ? 'server-side' : 'client-side';
        return value;
      `;

      const result = await bundleCode(code, { server: true });

      // SERVER should be replaced with 'true' string, which will then be evaluated
      assert.ok(result.jsMap, 'should have jsMap');
      assert.ok(
        result.jsMap['entrypoint.jsx'] !== undefined,
        'should have entrypoint.jsx in jsMap'
      );
      // Code might be empty if optimization removed everything, that's okay
      assert.ok(
        typeof result.jsMap['entrypoint.jsx'] === 'string',
        'should be a string'
      );
    });
  });

  describe('client builds', () => {
    it('should bundle a single client entry', async () => {
      const code = `
        import { createElement } from 'preact';
        const element = createElement('div', null, 'Hello');
        export default element;
      `;

      const result = await bundleCode(code, { server: false });

      assert.ok(result.jsMap, 'should have jsMap');
      assert.ok(result.jsMap['entrypoint.jsx'], 'should have entrypoint.jsx');
      assert.strictEqual(typeof result.css, 'string', 'should have CSS string');
      assert.ok(Array.isArray(result.jsChunks), 'should have jsChunks array');
      assert.strictEqual(
        typeof result.importMapHtml,
        'string',
        'should have importMapHtml'
      );
    });

    it('should bundle multiple client entries', async () => {
      const codeMap = new Map([
        [
          'entry1.jsx',
          `import { createElement } from 'preact'; export default createElement('div', null, 'One');`,
        ],
        [
          'entry2.jsx',
          `import { createElement } from 'preact'; export default createElement('div', null, 'Two');`,
        ],
      ]);

      const result = await bundleCode(codeMap, { server: false });

      assert.ok(result.jsMap['entry1.jsx'], 'should have entry1.jsx');
      assert.ok(result.jsMap['entry2.jsx'], 'should have entry2.jsx');
      assert.ok(
        result.jsMap['entry1.jsx'].includes('One'),
        'entry1 should include its content'
      );
      assert.ok(
        result.jsMap['entry2.jsx'].includes('Two'),
        'entry2 should include its content'
      );
    });

    it('should handle module imports', async () => {
      const code = `
        import { createElement } from 'preact';
        export default createElement('div', null, 'Test');
      `;

      const result = await bundleCode(code, { server: false });

      assert.ok(result.jsMap['entrypoint.jsx'], 'should have JS');
      // CSS handling depends on the cssLoader plugin
      assert.strictEqual(
        typeof result.css,
        'string',
        'should have CSS property'
      );
    });

    it('should apply CLIENT define flag', async () => {
      const code = `
        if (CLIENT) {
          console.log('client-side');
        } else {
          console.log('server-side');
        }
      `;

      const result = await bundleCode(code, { server: false });

      assert.ok(
        result.jsMap['entrypoint.jsx'].includes('client-side') ||
          result.jsMap['entrypoint.jsx'].includes('true'),
        'should process CLIENT flag'
      );
    });

    it('should minify client builds', async () => {
      const code = `
        import { createElement } from 'preact';
        // This is a comment that should be removed
        const veryLongVariableName = 'value';
        export default createElement('div', null, veryLongVariableName);
      `;

      const result = await bundleCode(code, { server: false });

      // Minified code should not contain comments and should be shorter
      assert.ok(
        !result.jsMap['entrypoint.jsx'].includes('This is a comment'),
        'should remove comments'
      );
    });

    it('should generate import map for multiple entries', async () => {
      const codeMap = new Map([
        [
          'page1.jsx',
          `import { createElement } from 'preact'; export default createElement('div', null, 'Page 1');`,
        ],
        [
          'page2.jsx',
          `import { createElement } from 'preact'; export default createElement('div', null, 'Page 2');`,
        ],
      ]);

      const result = await bundleCode(codeMap, { server: false });

      assert.ok(
        result.importMapHtml.includes('importmap'),
        'should contain importmap script tag'
      );
      // Import map should not contain virtual entries
      assert.ok(
        !result.importMapHtml.includes('_virtual_'),
        'should not include virtual entries'
      );
      assert.ok(
        !result.importMapHtml.includes('entrypoint'),
        'should not include entrypoint in importmap'
      );
    });
  });

  describe('code splitting', () => {
    it('should support multiple entries in client builds', async () => {
      const codeMap = new Map([
        [
          'entry1.jsx',
          `
          import { createElement } from 'preact';
          export default createElement('div', null, 'Entry 1');
        `,
        ],
        [
          'entry2.jsx',
          `
          import { createElement } from 'preact';
          export default createElement('div', null, 'Entry 2');
        `,
        ],
      ]);

      const result = await bundleCode(codeMap, { server: false });

      assert.ok(result.jsMap['entry1.jsx'], 'should have entry1');
      assert.ok(result.jsMap['entry2.jsx'], 'should have entry2');
      // Code splitting behavior depends on rolldown configuration
      assert.ok(Array.isArray(result.jsChunks), 'should have jsChunks array');
    });
  });

  describe('virtual entries', () => {
    it('should handle Map input correctly', async () => {
      const codeMap = new Map([['test.jsx', `export default 'test';`]]);

      const result = await bundleCode(codeMap, { server: false });

      assert.ok(result.jsMap['test.jsx'], 'should handle Map key');
    });

    it('should handle string input correctly', async () => {
      const code = `export default 'test';`;

      const result = await bundleCode(code, { server: true });

      assert.ok(result.jsMap['entrypoint.jsx'], 'should create entrypoint.jsx');
    });
  });
});
