import Badge from '@node-core/ui-components/Common/Badge';

import styles from './index.module.css';

const STABILITY_KINDS = ['error', 'warning', 'success', 'info'];
const STABILITY_TOOLTIPS = ['Deprecated', 'Experimental', 'Stable', 'Legacy'];

/**
 * @typedef StabilityOverviewEntry
 * @property {string} api - The API identifier (basename, e.g. "fs")
 * @property {string} name - The human-readable display name of the API module
 * @property {number} stabilityIndex - The stability level index (0–3)
 * @property {string} stabilityDescription - First sentence of the stability description
 */

/**
 * Renders a table summarising the stability level of each API module.
 *
 * @param {{ entries: Array<StabilityOverviewEntry> }} props
 */
export default ({ entries = [] }) => {
  if (!entries.length) {
    return null;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>API</th>
          <th>Stability</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(({ api, name, stabilityIndex, stabilityDescription }) => (
          <tr key={api}>
            <td>
              <a href={`${api}.html`}>{name}</a>
            </td>
            <td className={styles.stabilityCell}>
              <Badge
                kind={STABILITY_KINDS[stabilityIndex]}
                data-tooltip={STABILITY_TOOLTIPS[stabilityIndex]}
                aria-label={`Stability: ${STABILITY_TOOLTIPS[stabilityIndex]}`}
              >
                {stabilityIndex}
              </Badge>

              {` ${stabilityDescription}`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
