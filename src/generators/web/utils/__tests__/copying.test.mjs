import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, it, mock, beforeEach } from 'node:test';

const mockCp = mock.fn(() => Promise.resolve());
mock.module('node:fs/promises', {
  namedExports: { cp: mockCp },
});

const mockLogError = mock.fn();
mock.module('../../../../logger/index.mjs', {
  defaultExport: { error: mockLogError },
});

const { copyStaticAssets } = await import('../copying.mjs');

describe('copyStaticAssets', () => {
  beforeEach(() => {
    mockCp.mock.resetCalls();
    mockLogError.mock.resetCalls();
    mockCp.mock.mockImplementation(() => Promise.resolve());
  });

  it('does nothing if config.pathsToCopy is not an array', async () => {
    await copyStaticAssets({ pathsToCopy: undefined });
    assert.strictEqual(mockCp.mock.callCount(), 0);
  });

  it('ignores falsy items in pathsToCopy array', async () => {
    const config = {
      output: '/out',
      pathsToCopy: [null, undefined, false, ''],
    };
    await copyStaticAssets(config);
    assert.strictEqual(mockCp.mock.callCount(), 0);
  });

  it('copies simple string paths correctly to the output directory', async () => {
    const config = {
      output: '/out',
      pathsToCopy: ['src/assets', 'docs/images'],
    };

    await copyStaticAssets(config);

    assert.strictEqual(mockCp.mock.callCount(), 2);

    assert.deepStrictEqual(mockCp.mock.calls[0].arguments, [
      'src/assets',
      join('/out', 'assets'),
      { recursive: true, force: true },
    ]);

    assert.deepStrictEqual(mockCp.mock.calls[1].arguments, [
      'docs/images',
      join('/out', 'images'),
      { recursive: true, force: true },
    ]);
  });

  it('copies object mappings correctly and strips leading slashes from dest', async () => {
    const config = {
      output: '/out',
      pathsToCopy: [
        {
          'src/custom': '/dest-folder/custom', // Leading slash should be stripped
          'src/another': 'another-folder',
        },
      ],
    };

    await copyStaticAssets(config);

    assert.strictEqual(mockCp.mock.callCount(), 2);

    assert.deepStrictEqual(mockCp.mock.calls[0].arguments, [
      'src/custom',
      join('/out', 'dest-folder/custom'),
      { recursive: true, force: true },
    ]);

    assert.deepStrictEqual(mockCp.mock.calls[1].arguments, [
      'src/another',
      join('/out', 'another-folder'),
      { recursive: true, force: true },
    ]);
  });

  it('ignores ENOENT errors silently', async () => {
    // Simulate an ENOENT error when trying to copy
    mockCp.mock.mockImplementationOnce(() => {
      const err = new Error('File not found');
      err.code = 'ENOENT';
      throw err;
    });

    await copyStaticAssets({
      output: '/out',
      pathsToCopy: ['missing-file'],
    });

    assert.strictEqual(mockCp.mock.callCount(), 1);
    assert.strictEqual(mockLogError.mock.callCount(), 0);
  });

  it('logs errors that are not ENOENT using the logger', async () => {
    // Simulate a generic/permission error
    mockCp.mock.mockImplementationOnce(() => {
      throw new Error('Permission denied');
    });

    await copyStaticAssets({
      output: '/out',
      pathsToCopy: ['protected-file'],
    });

    assert.strictEqual(mockCp.mock.callCount(), 1);
    assert.strictEqual(mockLogError.mock.callCount(), 1);

    const logMessage = mockLogError.mock.calls[0].arguments[0];
    assert.match(
      logMessage,
      /\[web-generator\] Failed to copy asset from protected-file to \/out\/protected-file: Permission denied/
    );
  });
});
