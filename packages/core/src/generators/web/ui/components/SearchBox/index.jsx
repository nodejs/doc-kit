import {
  ArrowDownIcon,
  ArrowTurnDownLeftIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/solid';
import SearchModal from '@node-core/ui-components/Common/Search/Modal';
import SearchResults from '@node-core/ui-components/Common/Search/Results';
import SearchHit from '@node-core/ui-components/Common/Search/Results/Hit';

import styles from './index.module.css';
import useOrama from '../../hooks/useOrama.mjs';
import { relativeOrAbsolute } from '../../utils/relativeOrAbsolute.mjs';

/**
 * Dismisses the search modal the clicked hit sits in
 *
 * @param {MouseEvent} event
 */
const followSearchHit = event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
    return;
  }

  const { href } = event.currentTarget;

  event.preventDefault();

  // Escape is the only dismissal `SearchModal` exposes to the hits it renders.
  event.currentTarget.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );

  // A plain `location.href` assignment covers both cases: same-page hits
  // become a native fragment navigation (hash, scroll and history entry
  // included), cross-page hits simply load the target page. The nested
  // `requestAnimationFrame` waits for the modal to actually close —
  // navigating while it is still open suppresses the fragment scroll.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      window.location.href = href;
    })
  );
};

/**
 * A search hit link that dismisses the modal when followed.
 * @param {Object} props - Anchor props, as passed by `SearchHit`.
 */
const SearchHitLink = props => <a {...props} onClick={followSearchHit} />;

const SearchBox = ({ pathname }) => {
  const client = useOrama(pathname);

  return (
    <SearchModal client={client} placeholder="Start typing...">
      <div className={styles.searchResultsContainer}>
        <SearchResults
          noResultsTitle="No results found for"
          onHit={hit => (
            <SearchHit
              as={SearchHitLink}
              document={{
                ...hit.document,
                href: relativeOrAbsolute(hit.document.href, pathname),
              }}
            />
          )}
        />
      </div>

      <div className={styles.footer}>
        <div className={styles.shortcutWrapper}>
          <div className={styles.shortcutItem}>
            <kbd className={styles.shortcutKey}>
              <ArrowTurnDownLeftIcon />
            </kbd>
            <span className={styles.shortcutLabel}>to select</span>
          </div>

          <div className={styles.shortcutItem}>
            <kbd className={styles.shortcutKey}>
              <ArrowDownIcon />
            </kbd>
            <kbd className={styles.shortcutKey}>
              <ArrowUpIcon />
            </kbd>
            <span className={styles.shortcutLabel}>to navigate</span>
          </div>

          <div className={styles.shortcutItem}>
            <kbd className={styles.shortcutKey}>esc</kbd>
            <span className={styles.shortcutLabel}>to close</span>
          </div>
        </div>
      </div>
    </SearchModal>
  );
};

export default SearchBox;
