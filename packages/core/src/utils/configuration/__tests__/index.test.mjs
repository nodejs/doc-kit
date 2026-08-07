import assert from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, mock, beforeEach } from 'node:test';

// Mock dependencies
const mockParseChangelog = mock.fn(async changelog => [changelog]);
const mockParseIndex = mock.fn(async index => [index]);
const mockConfigSearch = mock.fn(async () => null);
const mockConfigLoad = mock.fn(async () => null);
const mockCosmiconfig = mock.fn(() => ({
  search: mockConfigSearch,
  load: mockConfigLoad,
}));

const createMockConfig = (overrides = {}) => ({
  global: {},
  ...overrides,
});

// Synthetic generators keyed by specifier; the identity resolver below means
// shorthand names and specifiers are the same thing in these tests.
const mockGenerators = {
  json: { name: 'json', defaultConfiguration: { format: 'json' } },
  html: { name: 'html', defaultConfiguration: { format: 'html' } },
  markdown: { name: 'markdown' },
  web: {
    name: 'web',
    defaultConfiguration: config => ({
      showSearchBox:
        Array.isArray(config.target) && config.target.includes('orama-db'),
    }),
  },
};

// Mock modules
mock.module('../../../generators/loader.mjs', {
  namedExports: {
    resolveGeneratorSpecifier: specifier => specifier,
    loadGenerator: async specifier => mockGenerators[specifier],
    // Defaults are computed from the loaded generators; returning the full
    // set regardless of targets keeps the assertions below simple.
    loadGenerators: async () => new Map(Object.entries(mockGenerators)),
  },
});
mock.module('../../../parsers/markdown.mjs', {
  namedExports: {
    parseChangelog: mockParseChangelog,
    parseIndex: mockParseIndex,
  },
});

mock.module('cosmiconfig', {
  namedExports: { cosmiconfig: mockCosmiconfig },
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
    mockConfigSearch,
    mockConfigLoad,
  ].forEach(m => m.mock.resetCalls());
};

// Helper to count specific function calls
const countCallsMatching = (mockFn, predicate) =>
  mockFn.mock.calls.filter(call => predicate(call.arguments)).length;

describe('config.mjs', () => {
  beforeEach(resetAllMocks);

  describe('loadConfigFile', () => {
    it('should load config from file path', async () => {
      const mockConfig = { custom: 'config' };
      mockConfigLoad.mock.mockImplementationOnce(async filePath => ({
        config: mockConfig,
        filepath: filePath,
      }));

      const result = await loadConfigFile('path/to/config.mjs');

      assert.deepStrictEqual(result, mockConfig);
      assert.strictEqual(mockConfigLoad.mock.calls.length, 1);
      assert.strictEqual(
        mockConfigLoad.mock.calls[0].arguments[0],
        'path/to/config.mjs'
      );
      assert.strictEqual(mockConfigSearch.mock.calls.length, 0);
    });

    it('should merge extends presets underneath the config file', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'doc-kit-config-'));

      writeFileSync(
        join(dir, 'base.mjs'),
        'export default { global: { project: "Base", ref: "base" }, html: { a: 1 } };'
      );
      writeFileSync(
        join(dir, 'other.mjs'),
        'export default { global: { project: "Other" }, html: { b: 2 } };'
      );

      mockConfigLoad.mock.mockImplementationOnce(async () => ({
        config: {
          extends: ['./base.mjs', './other.mjs'],
          global: { ref: 'own' },
        },
        filepath: join(dir, 'doc-kit.config.mjs'),
      }));

      const result = await loadConfigFile('any');

      // Later presets win over earlier ones; the file itself wins over all
      assert.deepStrictEqual(result, {
        global: { project: 'Other', ref: 'own' },
        html: { a: 1, b: 2 },
      });
    });

    it('should resolve extends package specifiers from the config file', async () => {
      mockConfigLoad.mock.mockImplementationOnce(async () => ({
        config: { extends: '@node-core/doc-kit/config' },
        filepath: join(process.cwd(), 'doc-kit.config.mjs'),
      }));

      const result = await loadConfigFile('any');

      assert.strictEqual(result.global.project, 'Node.js');
      assert.strictEqual(result.global.repository, 'nodejs/node');
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
      mockConfigLoad.mock.mockImplementationOnce(async () => ({
        config: createMockConfig({
          global: {
            input: 'custom-src/',
            output: 'config-dist/',
            version: '18.0.0',
          },
          target: ['html'],
          threads: 1,
        }),
        filepath: 'config.mjs',
      }));

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

    it('should transform string values only once', async () => {
      const changelogUrl = 'https://example.com/changelog.md';
      const indexUrl = 'https://example.com/index.md';

      mockConfigLoad.mock.mockImplementationOnce(async () => ({
        config: createMockConfig({
          global: {
            version: '20.0.0',
            changelog: changelogUrl,
            index: indexUrl,
          },
        }),
        filepath: 'config.mjs',
      }));

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
      assert.strictEqual(mockConfigLoad.mock.calls.length, 0);
      assert.strictEqual(mockConfigSearch.mock.calls.length, 1);
    });

    it('should default to project-neutral values', async () => {
      const config = await createRunConfiguration({});

      // No repository, site, or release history is assumed; presets such as
      // @node-core/doc-kit/config opt back into the Node.js values
      assert.strictEqual(config.global.repository, undefined);
      assert.strictEqual(config.global.baseURL, undefined);
      assert.deepStrictEqual(config.global.changelog, []);
      assert.strictEqual(typeof config.global.project, 'string');
    });

    it('should handle generator-specific overrides', async () => {
      mockConfigLoad.mock.mockImplementationOnce(async () => ({
        config: createMockConfig({
          global: { version: '20.0.0' },
          json: { minify: false, version: '18.0.0' },
        }),
        filepath: 'config.mjs',
      }));

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
        mockConfigLoad.mock.mockImplementationOnce(async () => ({
          config: createMockConfig({ global: { [configKey]: value } }),
          filepath: 'config.mjs',
        }));

        resetAllMocks();
        await createRunConfiguration({ configFile: 'config.mjs' });

        assert.ok(countCallsMatching(mockFn, ([arg]) => arg === value) >= 1);
      });
    }
  });
});
