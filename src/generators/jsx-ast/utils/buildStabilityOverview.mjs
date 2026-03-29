import { createJSXElement } from './ast.mjs';
import { JSX_IMPORTS } from '../../web/constants.mjs';

/**
 * Builds the Stability Overview component.
 *
 * @param {Array<{ api: string, name: string, stabilityIndex: number, stabilityDescription: string }>} entries
 * @returns {import('unist').Node}
 */
const buildStabilityOverview = entries =>
  createJSXElement(JSX_IMPORTS.StabilityOverview.name, {
    inline: false,
    entries,
  });

export default buildStabilityOverview;
