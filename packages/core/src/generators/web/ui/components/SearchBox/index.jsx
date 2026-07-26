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

const SearchBox = ({ pathname }) => {
  const client = useOrama(pathname);

  return (
    <SearchModal client={client} placeholder="Start typing...">
      <div className={styles.searchResultsContainer}>
        <SearchResults
          noResultsTitle="No results found for"
          onHit={hit => (
            <SearchHit
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
