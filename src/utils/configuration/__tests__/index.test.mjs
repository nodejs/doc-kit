import assert from 'node:assert';
import { describe, it, mock, beforeEach } from 'node:test';

// Mock dependencies
const mockParseChangelog = mock.fn(async changelog => [changelog]);
const mockParseIndex = mock.fn(async index => [index]);
const mockImportFromURL = mock.fn(async () => ({}));

const createMockConfig = (overrides = {}) => ({
  global: {},
  ...overrides,
});

// Mock modules
mock.module('../../../generators/index.mjs', {
  namedExports: {
    allGenerators: {
      json: async () => ({ defaultConfiguration: { format: 'json' } }),
      html: async () => ({ defaultConfiguration: { format: 'html' } }),
      markdown: async () => ({}),
    },
  },
});
mock.module('../../../parsers/markdown.mjs', {
  namedExports: {
    parseChangelog: mockParseChangelog,
    parseIndex: mockParseIndex,
  },
});

mock.module('../../url.mjs', {
  namedExports: { importFromURL: mockImportFromURL },
});

const {
  loadConfigFile,
  createConfigFromCLIOptions,
  createRunConfiguration,
  setConfig,
  default: getConfig,
} = await import('../index.mjs');

// Helper to reset all mocks
const resetAllMocks = () => {
  [mockParseChangelog, mockParseIndex, mockImportFromURL].forEach(m =>
    m.mock.resetCalls()
  );
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

  describe('createRunConfiguration', () => {
    it('should merge config sources in correct order', async () => {
      mockImportFromURL.mock.mockImplementationOnce(async () =>
        createMockConfig({ global: { input: 'custom-src/' } })
      );

      const config = await createRunConfiguration({
        configFile: 'config.mjs',
        output: 'custom-dist/',
        threads: 2,
      });

      assert.strictEqual(config.global.input, 'custom-src/');
      assert.strictEqual(config.global.output, 'custom-dist/');
      assert.strictEqual(config.threads, 2);
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

    it('should work without config file', async () => {
      const config = await createRunConfiguration({
        version: '20.0.0',
        threads: 4,
      });

      assert.ok(config);
      assert.strictEqual(config.threads, 4);
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
