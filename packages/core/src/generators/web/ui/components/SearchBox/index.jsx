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

  const target = new URL(event.currentTarget.href);

  event.preventDefault();

  // Escape is the only dismissal `SearchModal` exposes to the hits it renders.
  event.currentTarget.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );

  requestAnimationFrame(() => {
    if (target.pathname !== window.location.pathname) {
      window.location.href = target.href;
      return;
    }

    requestAnimationFrame(() => {
      // Keep the URL hash in sync with the followed hit, since
      // `scrollIntoView` alone leaves the previous hash untouched.
      history.pushState(null, '', target.hash || target.pathname);

      document
        .getElementById(decodeURIComponent(target.hash.slice(1)))
        ?.scrollIntoView();
    });
  });
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
