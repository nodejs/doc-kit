import { h as createElement } from 'hastscript';

import { createJSXElement } from './ast.mjs';
import { JSX_IMPORTS } from '../../web/constants.mjs';

const STABILITY_KINDS = ['error', 'warning', 'default', 'info'];

/**
 *
 */
const createBadge = (stabilityIndex, stabilityDescription) => {
  const kind = STABILITY_KINDS[stabilityIndex] ?? 'success';

  return createJSXElement(JSX_IMPORTS.BadgeGroup.name, {
    as: 'span',
    size: 'small',
    kind,
    badgeText: stabilityIndex,
    children: stabilityDescription,
  });
};

/**
 * Builds a static Stability Overview table.
 *
 * @param {Array<{ api: string, name: string, stabilityIndex: number, stabilityDescription: string }>} entries
 * @returns {import('hast').Element}
 */
const buildStabilityOverview = entries => {
  const rows = entries.map(
    ({ api, name, stabilityIndex, stabilityDescription }) =>
      createElement('tr', [
        createElement('td', createElement('a', { href: `${api}.html` }, name)),
        createElement('td', createBadge(stabilityIndex, stabilityDescription)),
      ])
  );

  return createElement('table', [
    createElement('thead', [
      createElement('tr', [
        createElement('th', 'API'),
        createElement('th', 'Stability'),
      ]),
    ]),
    createElement('tbody', rows),
  ]);
};

export default buildStabilityOverview;
