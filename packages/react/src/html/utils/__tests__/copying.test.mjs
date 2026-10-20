import { join } from 'node:path';
import { describe, it, mock, beforeEach } from 'node:test';

const mockCp = mock.fn(() => Promise.resolve());
mock.module('node:fs/promises', {
  exports: { cp: mockCp },
});

const mockLogError = mock.fn();
mock.module('@doc-kit/core/logger/index.mjs', {
  exports: { default: { error: mockLogError } },
});

const { copyStaticAssets } = await import('../copying.mjs');

describe('copyStaticAssets', () => {
  beforeEach(() => {
    mockCp.mock.resetCalls();
    mockLogError.mock.resetCalls();
    mockCp.mock.mockImplementation(() => Promise.resolve());
  });

  it('does nothing if config.pathsToCopy is not an array', async t => {
    await copyStaticAssets({ pathsToCopy: undefined });
    t.assert.callCount(mockCp, 0);
  });

  it('ignores falsy items in pathsToCopy array', async t => {
    const config = {
      output: '/out',
      pathsToCopy: [null, undefined, false, ''],
    };
    await copyStaticAssets(config);
    t.assert.callCount(mockCp, 0);
  });

  it('copies simple string paths correctly to the output directory', async t => {
    const config = {
      output: '/out',
      pathsToCopy: ['src/assets', 'docs/images'],
    };

    await copyStaticAssets(config);

    t.assert.callCount(mockCp, 2);

    t.assert.nthCalledWith(mockCp, 1, 'src/assets', join('/out', 'assets'), {
      recursive: true,
      force: true,
    });

    t.assert.nthCalledWith(mockCp, 2, 'docs/images', join('/out', 'images'), {
      recursive: true,
      force: true,
    });
  });

  it('copies object mappings correctly and strips leading slashes from dest', async t => {
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

    t.assert.callCount(mockCp, 2);

    t.assert.nthCalledWith(
      mockCp,
      1,
      'src/custom',
      join('/out', 'dest-folder/custom'),
      { recursive: true, force: true }
    );

    t.assert.nthCalledWith(
      mockCp,
      2,
      'src/another',
      join('/out', 'another-folder'),
      { recursive: true, force: true }
    );
  });

  it('ignores ENOENT errors silently', async t => {
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

    t.assert.callCount(mockCp, 1);
    t.assert.callCount(mockLogError, 0);
  });

  it('logs errors that are not ENOENT using the logger', async t => {
    // Simulate a generic/permission error
    mockCp.mock.mockImplementationOnce(() => {
      throw new Error('Permission denied');
    });

    await copyStaticAssets({
      output: '/out',
      pathsToCopy: ['protected-file'],
    });

    t.assert.callCount(mockCp, 1);
    t.assert.callCount(mockLogError, 1);

    t.assert.nthCalledWith(
      mockLogError,
      1,
      `[html-generator] Failed to copy asset from protected-file to ${join('/out', 'protected-file')}: Permission denied`
    );
  });
});
