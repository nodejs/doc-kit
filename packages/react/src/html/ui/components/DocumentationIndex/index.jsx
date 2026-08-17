import Badge from '@node-core/ui-components/Common/Badge';

import styles from './index.module.css';
import { STABILITY_KINDS, STABILITY_LABELS } from '../constants.mjs';

/**
 * @typedef {Object} DocumentationIndexEntry
 * @property {string} api - Basename of the document, linked as `${api}.html`
 * @property {string} name - Human-readable name from the document's heading
 * @property {string} index - Stability index (e.g. `'2'` or `'1.1'`)
 */

/**
 * @param {DocumentationIndexEntry} props
 */
const IndexEntry = ({ api, name, index, description }) => {
  const level = parseInt(index, 10);
  const label = STABILITY_LABELS[level] ?? index;

  return (
    <a className={styles.entry} href={`${api}.html`}>
      <span className={styles.title}>
        <span className={styles.name}>{name}</span>

        <Badge
          size="small"
          kind={STABILITY_KINDS[level] ?? 'neutral'}
          aria-label={`Stability: ${index}`}
        >
          {label}
        </Badge>
      </span>

      {description && <span className={styles.summary}>{description}</span>}
    </a>
  );
};

/**
 * @param {{ entries: Array<DocumentationIndexEntry> }} props
 */
export default ({ entries = [] }) => (
  <nav className={styles.documentationIndex} aria-label="Documentation index">
    {entries.map(entry => (
      <IndexEntry key={entry.api} {...entry} />
    ))}
  </nav>
);
