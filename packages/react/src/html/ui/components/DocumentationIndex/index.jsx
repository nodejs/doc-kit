import Badge from '@node-core/ui-components/Common/Badge';

import styles from './index.module.css';
import { STABILITY_KINDS, STABILITY_LABELS } from '../constants.mjs';

import { documentationIndex } from '#theme/config';

/**
 * @typedef {Object} DocumentationIndexEntry
 * @property {string} api - Basename of the document, linked as `${api}.html`
 * @property {string} name - Human-readable name from the document's heading
 * @property {string} index - Stability index (e.g. `'2'` or `'1.1'`)
 * @property {string} [description] - The document's `llm_description`, or its
 * first paragraph, rendered to HTML at build time
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

      {description && (
        <span
          className={styles.summary}
          // Rendered from the document's own markdown at build time
          dangerouslySetInnerHTML={{ __html: description }}
        />
      )}
    </a>
  );
};

export default () => (
  <nav className={styles.documentationIndex} aria-label="Documentation index">
    {documentationIndex.map(entry => (
      <IndexEntry key={entry.api} {...entry} />
    ))}
  </nav>
);
