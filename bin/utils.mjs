import createMarkdownLoader from '../src/loaders/markdown.mjs';
import { Logger } from '../src/logger/index.mjs';
import createMarkdownParser from '../src/parsers/markdown.mjs';

/**
 * Generic lazy initializer.
 * @template T
 * @param {() => T} factory - Function to create the instance.
 * @returns {() => T} - A function that returns the singleton instance.
 */
export const lazy = factory => {
  let instance;
  return args => (instance ??= factory(args));
};

// Instantiate loader and parser once to reuse,
// but only if/when we actually need them. No need
// to create these objects just to load a different
// utility.
const loader = lazy(createMarkdownLoader);
const parser = lazy(createMarkdownParser);

/**
 * Load and parse markdown API docs.
 * @param {string[]} input - Glob patterns for input files.
 * @param {string[]} [ignore] - Glob patterns to ignore.
 * @param {import('../src/linter/types').Linter} [linter] - Linter instance
 * @returns {Promise<Array<ParserOutput<import('mdast').Root>>>}
 */
export async function loadAndParse(input, ignore, linter) {
  const files = await loader().loadFiles(input, ignore);
  return parser(linter).parseApiDocs(files);
}

/**
 * Wraps a function to catch both synchronous and asynchronous errors.
 *
 * @param {Function} fn - The function to wrap. Can be synchronous or return a Promise.
 * @returns {Function} A new function that handles errors and logs them.
 */
export const errorWrap =
  fn =>
  async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      Logger.getInstance().error(err);
      process.exit(1);
    }
  };

/**
 * Represents a command-line option for the linter CLI.
 * @typedef {Object} Option
 * @property {string[]} flags - Command-line flags, e.g., ['-i, --input <patterns...>'].
 * @property {string} desc - Description of the option.
 * @property {Object} [prompt] - Optional prompt configuration.
 * @property {'text'|'confirm'|'select'|'multiselect'} prompt.type - Type of the prompt.
 * @property {string} prompt.message - Message displayed in the prompt.
 * @property {boolean} [prompt.variadic] - Indicates if the prompt accepts multiple values.
 * @property {boolean} [prompt.required] - Whether the prompt is required.
 * @property {boolean} [prompt.initialValue] - Default value for confirm prompts.
 * @property {{label: string, value: string}[]} [prompt.options] - Options for select/multiselect prompts.
 */

/**
 * Represents a command-line subcommand
 * @typedef {Object} Command
 * @property {{ [key: string]: Option }} options
 * @property {string} name
 * @property {string} description
 * @property {Function} action
 */
