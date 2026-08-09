import { TITLE } from '../constants.mjs';

/**
 * Folds the performance estimate
 *
 * @param {string} performance - Performance summary
 * @returns {string} Collapsed Markdown section
 */
const fold = performance =>
  [
    '<details>',
    '<summary><h3>Performance estimate</h3></summary>',
    '',
    performance,
    '',
    '</details>',
  ].join('\n');

/**
 * @typedef {{ base?: string, head?: string, identical: boolean }} Pair
 */

/**
 * @param {Pair} pair - Paired output file
 * @returns {boolean} Whether the file changed name between the two builds
 */
export const isRename = ({ base, head }) =>
  Boolean(base && head && base !== head);

/**
 * Names a pair, spelling out both sides of a rename.
 *
 * @param {Pair} pair - Paired output file
 * @returns {string} Display name
 */
export const pairName = pair =>
  isRename(pair) ? `${pair.base} → ${pair.head}` : (pair.head ?? pair.base);

/**
 * @param {number} amount - How many things there are
 * @param {string} singular - Wording for one of them
 * @param {string} plural - Wording for any other count
 * @returns {string} Counted phrase, e.g. "2 files"
 */
export const count = (amount, singular, plural) =>
  `${amount} ${amount === 1 ? singular : plural}`;

/**
 * Prints one generator's slice of the pull request comment.
 *
 * @param {Array<string>} sections - Output differences worth showing up front
 * @param {string} performance - Performance summary, or an empty string
 * @returns {void}
 */
export const report = (sections, performance) => {
  const body = [...sections, performance && fold(performance)].filter(Boolean);

  if (body.length) {
    console.log(`${TITLE}\n\n${body.join('\n\n')}\n`);
  }
};
