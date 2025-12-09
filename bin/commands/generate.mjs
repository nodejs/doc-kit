import { cpus } from 'node:os';
import { resolve } from 'node:path';

import { coerce } from 'semver';

import { NODE_CHANGELOG_URL, NODE_VERSION } from '../../src/constants.mjs';
import { publicGenerators } from '../../src/generators/index.mjs';
import createGenerator from '../../src/generators.mjs';
import { parseChangelog, parseIndex } from '../../src/parsers/markdown.mjs';
import { DEFAULT_TYPE_MAP } from '../../src/utils/parser/constants.mjs';
import { loadFromURL } from '../../src/utils/parser.mjs';
import { loadAndParse } from '../utils.mjs';

const availableGenerators = Object.keys(publicGenerators);

// Half of available logical CPUs guarantees in general all physical CPUs are being used
// which in most scenarios is the best way to maximize performance
// When spawning more than a said number of threads, the overhead of context switching
// and CPU contention starts to degrade performance rather than improve it.
// Therefore, we set the optimal threads to half the number of CPU cores, with a minimum of 6.
const optimalThreads = Math.max(cpus().length, 2);

/**
 * @typedef {Object} Options
 * @property {Array<string>|string} input - Specifies the glob/path for input files.
 * @property {Array<string>|string} [ignore] - Specifies the glob/path for ignoring files.
 * @property {Array<keyof publicGenerators>} target - Specifies the generator target mode.
 * @property {string} version - Specifies the target Node.js version.
 * @property {string} changelog - Specifies the path to the Node.js CHANGELOG.md file.
 * @property {string} typeMap - Specifies the path to the Node.js Type Map.
 * @property {string} [gitRef] - Git ref/commit URL.
 * @property {number} [threads] - Number of threads to allow.
 * @property {number} [chunkSize] - Number of items to process per worker thread.
 */

/**
 * @type {import('../utils.mjs').Command}
 */
export default {
  description: 'Generate API docs',
  name: 'generate',
  options: {
    input: {
      flags: ['-i', '--input <patterns...>'],
      desc: 'Input file patterns (glob)',
      prompt: {
        type: 'text',
        message: 'Enter input glob patterns',
        variadic: true,
        required: true,
      },
    },
    ignore: {
      flags: ['--ignore [patterns...]'],
      desc: 'Ignore patterns (comma-separated)',
      prompt: {
        type: 'text',
        message: 'Enter ignore patterns',
        variadic: true,
      },
    },
    output: {
      flags: ['-o', '--output <dir>'],
      desc: 'Output directory',
      prompt: { type: 'text', message: 'Enter output directory' },
    },
    threads: {
      flags: ['-p', '--threads <number>'],
      desc: 'Number of worker threads to use (minimum: 2)',
      prompt: {
        type: 'text',
        message: 'How many threads to allow',
        initialValue: String(Math.max(optimalThreads, 2)),
      },
    },
    chunkSize: {
      flags: ['--chunk-size <number>'],
      desc: 'Number of items to process per worker thread (default: auto)',
      prompt: {
        type: 'text',
        message: 'Items per worker thread',
        initialValue: '10',
      },
    },
    version: {
      flags: ['-v', '--version <semver>'],
      desc: 'Target Node.js version',
      prompt: {
        type: 'text',
        message: 'Enter Node.js version',
        initialValue: NODE_VERSION,
      },
    },
    changelog: {
      flags: ['-c', '--changelog <url>'],
      desc: 'Changelog URL or path',
      prompt: {
        type: 'text',
        message: 'Enter changelog URL',
        initialValue: NODE_CHANGELOG_URL,
      },
    },
    gitRef: {
      flags: ['--git-ref <url>'],
      desc: 'Git ref/commit URL',
      prompt: {
        type: 'text',
        message: 'Enter Git ref URL',
        initialValue: 'https://github.com/nodejs/node/tree/HEAD',
      },
    },
    target: {
      flags: ['-t', '--target [modes...]'],
      desc: 'Target generator modes',
      prompt: {
        required: true,
        type: 'multiselect',
        message: 'Choose target generators',
        options: availableGenerators.map(g => ({
          value: g,
          label: `${publicGenerators[g].name || g} (v${publicGenerators[g].version}) - ${publicGenerators[g].description}`,
        })),
      },
    },
    index: {
      flags: ['--index <path>'],
      desc: 'The index document, for getting the titles of various API docs',
      prompt: {
        message: 'Path to doc/api/index.md',
        type: 'text',
      },
    },
    typeMap: {
      flags: ['--type-map <path>'],
      desc: 'The mapping of types to links',
      prompt: {
        message: 'Path to doc/api/type_map.json',
        type: 'text',
        initialValue: DEFAULT_TYPE_MAP,
      },
    },
  },
  /**
   * Handles the action for generating API docs
   * @param {Options} opts - The options to generate API docs.
   * @returns {Promise<void>}
   */
  async action(opts) {
    const docs = await loadAndParse(opts.input, opts.ignore);
    const releases = await parseChangelog(opts.changelog);

    const rawTypeMap = await loadFromURL(opts.typeMap);
    const typeMap = JSON.parse(rawTypeMap);

    const index = opts.index && (await parseIndex(opts.index));

    const { runGenerators } = createGenerator(docs);

    await runGenerators({
      generators: opts.target,
      input: opts.input,
      output: opts.output && resolve(opts.output),
      version: coerce(opts.version),
      releases,
      gitRef: opts.gitRef,
      threads: Math.max(parseInt(opts.threads, 10), 2),
      chunkSize: parseInt(opts.chunkSize, 10),
      index,
      typeMap,
    });
  },
};
