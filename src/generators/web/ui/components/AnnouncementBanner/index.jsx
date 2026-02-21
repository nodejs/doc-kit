import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Banner from '@node-core/ui-components/Common/Banner';
import { useEffect, useState } from 'preact/hooks';

import { isBannerActive } from '../../utils/banner.mjs';

/** @import { BannerEntry, RemoteConfig } from './types.d.ts' */

/**
 * Asynchronously fetches and displays announcement banners from the remote config.
 * Global banners are rendered above version-specific ones.
 * Non-blocking: silently ignores fetch/parse failures.
 *
 * @param {{ remoteConfig: string, versionMajor: number | null }} props
 */
export default ({ remoteConfig, versionMajor }) => {
  const [banners, setBanners] = useState(/** @type {BannerEntry[]} */ ([]));

  useEffect(() => {
    if (!remoteConfig) {
      return;
    }

    fetch(remoteConfig, {
      signal: AbortSignal.timeout(2500),
    })
      .then(async res => {
        if (!res.ok) {
          return;
        }

        /** @type {RemoteConfig}  */
        const config = await res.json();

        const active = [];

        const globalBanner = config.global?.banner;
        if (globalBanner && isBannerActive(globalBanner)) {
          active.push(globalBanner);
        }

        if (versionMajor != null) {
          const versionBanner = config[`v${versionMajor}`]?.banner;
          if (versionBanner && isBannerActive(versionBanner)) {
            active.push(versionBanner);
          }
        }

        setBanners(active);
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  if (!banners.length) {
    return null;
  }

  return (
    <div role="region" aria-label="Announcements">
      {banners.map(banner => (
        <Banner key={banner.text ?? banner.text} type={banner.type}>
          {banner.link ? (
            <a href={banner.link} target="_blank" rel="noopener noreferrer">
              {banner.text}
              <ArrowUpRightIcon />
            </a>
          ) : (
            banner.text
          )}
        </Banner>
      ))}
    </div>
  );
};
