import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Banner from '@node-core/ui-components/Common/Banner';
import { lazy, Suspense } from 'preact/compat';
import { useMemo } from 'preact/hooks';

import styles from './index.module.css';
import { loadBanners } from './loadBanners.mjs';

/** @import { BannerEntry } from './types.d.ts' */

export default ({ remoteConfig, versionMajor }) => {
  const LazyBanners = useMemo(
    () =>
      lazy(async () => {
        const active = await loadBanners(remoteConfig, versionMajor);

        if (!active.length) {
          return { default: () => null };
        }

        return {
          default: () => (
            <div
              role="region"
              aria-label="Announcements"
              className={styles.banners}
            >
              {active.map(banner => (
                <Banner key={banner.text} type={banner.type}>
                  {banner.link ? (
                    <a
                      href={banner.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {banner.text}
                    </a>
                  ) : (
                    banner.text
                  )}
                  {banner.link && <ArrowUpRightIcon />}
                </Banner>
              ))}
            </div>
          ),
        };
      }),
    []
  );

  return (
    <Suspense fallback={null}>
      <LazyBanners />
    </Suspense>
  );
};
