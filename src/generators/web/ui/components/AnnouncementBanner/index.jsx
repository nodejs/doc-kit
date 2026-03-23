import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Banner from '@node-core/ui-components/Common/Banner';

import styles from './index.module.css';
import { useBanners } from './useBanners.mjs';

/**
 * Asynchronously fetches and displays announcement banners from the remote config.
 * Global banners are rendered above version-specific ones.
 * Non-blocking: silently ignores fetch/parse failures.
 *
 * @param {{ remoteConfig: string, versionMajor: number | null }} props
 */
export default ({ remoteConfig, versionMajor }) => {
  const { banners } = useBanners({ remoteConfig, versionMajor });

  if (!banners.length) {
    return null;
  }

  return (
    <div role="region" aria-label="Announcements" className={styles.banners}>
      {banners.map(banner => (
        <Banner key={banner.text ?? banner.text} type={banner.type}>
          {banner.link ? (
            <a href={banner.link} target="_blank" rel="noopener noreferrer">
              {banner.text}
            </a>
          ) : (
            banner.text
          )}
          {banner.link && <ArrowUpRightIcon />}
        </Banner>
      ))}
    </div>
  );
};
