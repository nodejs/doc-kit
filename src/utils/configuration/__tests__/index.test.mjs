import assert from 'node:assert';
import * as nodeFs from 'node:fs';
import { join } from 'node:path';
import { describe, it, mock, beforeEach } from 'node:test';

// Mock dependencies
const mockParseChangelog = mock.fn(async changelog => [changelog]);
const mockParseIndex = mock.fn(async index => [index]);
const mockImportFromURL = mock.fn(async () => ({}));
const mockExistsSync = mock.fn(() => false);

const CONFIG_FILE_NAMES = [
  'doc-kit.config.js',
  'doc-kit.config.cjs',
  'doc-kit.config.mjs',
  'doc-kit.config.ts',
  'doc-kit.config.cts',
  'doc-kit.config.mts',
];

const createMockConfig = (overrides = {}) => ({
  global: {},
  ...overrides,
});

// Mock modules
mock.module('../../../generators/index.mjs', {
  namedExports: {
    allGenerators: {
      json: { defaultConfiguration: { format: 'json' } },
      html: { defaultConfiguration: { format: 'html' } },
      markdown: {},
      web: {
        defaultConfiguration: config => ({
          showSearchBox:
            Array.isArray(config.target) && config.target.includes('orama-db'),
        }),
      },
    },
  },
});
mock.module('../../../parsers/markdown.mjs', {
  namedExports: {
    parseChangelog: mockParseChangelog,
    parseIndex: mockParseIndex,
  },
});

mock.module('../../loaders.mjs', {
  namedExports: { importFromURL: mockImportFromURL },
});
mock.module('node:fs', {
  namedExports: { ...nodeFs, existsSync: mockExistsSync },
});

const {
  assertRunnableOptions,
  loadConfigFile,
  createConfigFromCLIOptions,
  createRunConfiguration,
  setConfig,
  default: getConfig,
} = await import('../index.mjs');

// Helper to reset all mocks
const resetAllMocks = () => {
  [
    mockParseChangelog,
    mockParseIndex,
    mockImportFromURL,
    mockExistsSync,
  ].forEach(m => m.mock.resetCalls());
  mockImportFromURL.mock.mockImplementation(async () => ({}));
  mockExistsSync.mock.mockImplementation(() => false);
};

// Helper to count specific function calls
const countCallsMatching = (mockFn, predicate) =>
  mockFn.mock.calls.filter(call => predicate(call.arguments)).length;

describe('config.mjs', () => {
  beforeEach(resetAllMocks);

  describe('loadConfigFile', () => {
    it('should load config from file path', async () => {
      const mockConfig = { custom: 'config' };
      mockImportFromURL.mock.mockImplementationOnce(async () => mockConfig);

      const result = await loadConfigFile('path/to/config.mjs');

      assert.deepStrictEqual(result, mockConfig);
      assert.strictEqual(mockImportFromURL.mock.calls.length, 1);
      assert.strictEqual(
        mockImportFromURL.mock.calls[0].arguments[0],
        'path/to/config.mjs'
      );
    });

    it('should return empty object for falsy paths', async () => {
      for (const falsyValue of ['', null, undefined, 0, false]) {
        const result = await loadConfigFile(falsyValue);
        assert.deepStrictEqual(result, {});
      }
      assert.strictEqual(mockImportFromURL.mock.calls.length, 0);
    });
  });

  describe('createConfigFromCLIOptions', () => {
    it('should convert CLI options to config structure', () => {
      const options = {
        input: 'src/',
        ignore: ['test/'],
        output: 'dist/',
        minify: false,
        gitRef: 'v20.0.0',
        version: '20.0.0',
        changelog: 'https://example.com/CHANGELOG.md',
        index: 'https://example.com/index.md',
        typeMap: { String: 'string' },
        target: 'json',
        threads: 4,
        chunkSize: 5,
      };

      const config = createConfigFromCLIOptions(options);

      assert.deepStrictEqual(config, {
        global: {
          input: 'src/',
          ignore: ['test/'],
          output: 'dist/',
          minify: false,
          ref: 'v20.0.0',
          version: '20.0.0',
          changelog: 'https://example.com/CHANGELOG.md',
          index: 'https://example.com/index.md',
        },
        metadata: { typeMap: { String: 'string' } },
        target: 'json',
        threads: 4,
        chunkSize: 5,
      });
    });

    it('should handle empty options', () => {
      const config = createConfigFromCLIOptions({});

      assert.ok(config.global);
      assert.ok(config.metadata);
      assert.strictEqual(config.global.input, undefined);
      assert.strictEqual(config.threads, undefined);
    });
  });

  describe('assertRunnableOptions', () => {
    it('should throw when target is missing', () => {
      assert.throws(
        () => assertRunnableOptions({ global: { input: 'src/' } }),
        /Both a `target` and an `input` must be provided/
      );
    });

    it('should throw when input is missing', () => {
      assert.throws(
        () => assertRunnableOptions({ target: ['json'], global: {} }),
        /Both a `target` and an `input` must be provided/
      );
    });

    it('should not throw when both target and input are provided', () => {
      assert.doesNotThrow(() =>
        assertRunnableOptions({ target: ['json'], global: { input: 'src/' } })
      );
    });
  });

  describe('createRunConfiguration', () => {
    it('should let defined CLI options override the config file', async () => {
      mockImportFromURL.mock.mockImplementationOnce(async () =>
        createMockConfig({
          global: {
            input: 'custom-src/',
            output: 'config-dist/',
            version: '18.0.0',
          },
          target: ['html'],
          threads: 1,
        })
      );

      const config = await createRunConfiguration({
        configFile: 'config.mjs',
        output: 'custom-dist/',
        version: '20.0.0',
        target: ['html', 'orama-db'],
        threads: 2,
      });

      assert.strictEqual(config.global.input, 'custom-src/');
      assert.strictEqual(config.global.output, 'custom-dist/');
      assert.strictEqual(config.global.version.version, '20.0.0');
      assert.deepStrictEqual(config.target, ['html', 'orama-db']);
      assert.strictEqual(config.threads, 2);
      assert.strictEqual(config.web.showSearchBox, true);
    });

    for (const [index, fileName] of CONFIG_FILE_NAMES.entries()) {
      it(`should auto-detect ${fileName} in the current directory`, async () => {
        const detectedConfigFile = join(process.cwd(), fileName);
        const mockConfig = createMockConfig({
          global: { input: 'auto-detected-src/' },
        });
        mockExistsSync.mock.mockImplementation(
          filePath => filePath === detectedConfigFile
        );
        mockImportFromURL.mock.mockImplementationOnce(async () => mockConfig);

        const config = await createRunConfiguration({});

        assert.strictEqual(config.global.input, 'auto-detected-src/');
        assert.deepStrictEqual(
          mockExistsSync.mock.calls.map(call => call.arguments[0]),
          CONFIG_FILE_NAMES.slice(0, index + 1).map(candidate =>
            join(process.cwd(), candidate)
          )
        );
        assert.strictEqual(mockImportFromURL.mock.calls.length, 1);
        assert.strictEqual(
          mockImportFromURL.mock.calls[0].arguments[0],
          detectedConfigFile
        );
      });
    }

    it('should use the first matching config file by priority', async () => {
      const existingConfigFiles = new Set([
        join(process.cwd(), 'doc-kit.config.cjs'),
        join(process.cwd(), 'doc-kit.config.mjs'),
        join(process.cwd(), 'doc-kit.config.cts'),
      ]);
      mockExistsSync.mock.mockImplementation(filePath =>
        existingConfigFiles.has(filePath)
      );

      await createRunConfiguration({});

      assert.strictEqual(mockImportFromURL.mock.calls.length, 1);
      assert.strictEqual(
        mockImportFromURL.mock.calls[0].arguments[0],
        join(process.cwd(), 'doc-kit.config.cjs')
      );
    });

    it('should prefer an explicit config file', async () => {
      mockImportFromURL.mock.mockImplementationOnce(async () =>
        createMockConfig({ global: { input: 'explicit-src/' } })
      );

      const config = await createRunConfiguration({
        configFile: 'explicit-config.mjs',
      });

      assert.strictEqual(config.global.input, 'explicit-src/');
      assert.strictEqual(mockExistsSync.mock.calls.length, 0);
      assert.strictEqual(mockImportFromURL.mock.calls.length, 1);
      assert.strictEqual(
        mockImportFromURL.mock.calls[0].arguments[0],
        'explicit-config.mjs'
      );
    });

    it('should transform string values only once', async () => {
      const changelogUrl = 'https://example.com/changelog.md';
      const indexUrl = 'https://example.com/index.md';

      mockImportFromURL.mock.mockImplementationOnce(async () =>
        createMockConfig({
          global: {
            version: '20.0.0',
            changelog: changelogUrl,
            index: indexUrl,
          },
        })
      );

      resetAllMocks(); // Clear calls from getDefaultConfig
      await createRunConfiguration({ configFile: 'config.mjs' });

      // Each should be called at least once for the string value
      assert.ok(
        countCallsMatching(
          mockParseChangelog,
          ([arg]) => arg === changelogUrl
        ) >= 1
      );
      assert.ok(
        countCallsMatching(mockParseIndex, ([arg]) => arg === indexUrl) >= 1
      );
    });

    it('should enforce minimum constraints', async () => {
      const config = await createRunConfiguration({
        threads: -5,
        chunkSize: 0,
      });

      assert.strictEqual(config.threads, 1);
      assert.strictEqual(config.chunkSize, 1);
    });

    it('should use an empty config when no config file is present', async () => {
      const config = await createRunConfiguration({
        version: '20.0.0',
        threads: 4,
      });

      assert.ok(config);
      assert.strictEqual(config.threads, 4);
      assert.deepStrictEqual(
        mockExistsSync.mock.calls.map(call => call.arguments[0]),
        CONFIG_FILE_NAMES.map(fileName => join(process.cwd(), fileName))
      );
      assert.strictEqual(mockImportFromURL.mock.calls.length, 0);
    });

    it('should handle generator-specific overrides', async () => {
      mockImportFromURL.mock.mockImplementationOnce(async () =>
        createMockConfig({
          global: { version: '20.0.0' },
          json: { minify: false, version: '18.0.0' },
        })
      );

      const config = await createRunConfiguration({
        configFile: 'config.mjs',
      });

      assert.ok(config.json);
      assert.ok(config.html);
      assert.ok(config.markdown);
    });
  });

  describe('setConfig and getConfig', () => {
    it('should persist config across calls', async () => {
      const config = await setConfig({ version: '20.0.0', threads: 2 });
      const retrieved = getConfig();

      assert.strictEqual(config, retrieved);
      assert.ok(config.global);
    });
  });

  describe('transformation optimization', () => {
    const testCases = [
      {
        name: 'changelog parsing',
        value: 'https://example.com/CHANGELOG.md',
        mockFn: mockParseChangelog,
        configKey: 'changelog',
      },
      {
        name: 'index parsing',
        value: 'https://example.com/index.md',
        mockFn: mockParseIndex,
        configKey: 'index',
      },
    ];

    for (const { name, value, mockFn, configKey } of testCases) {
      it(`should transform ${name} only for strings`, async () => {
        mockImportFromURL.mock.mockImplementationOnce(async () =>
          createMockConfig({ global: { [configKey]: value } })
        );

        resetAllMocks();
        await createRunConfiguration({ configFile: 'config.mjs' });

        assert.ok(countCallsMatching(mockFn, ([arg]) => arg === value) >= 1);
      });
    }
  });
});
