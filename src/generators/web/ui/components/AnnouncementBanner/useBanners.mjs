import { useEffect, useState } from 'react';

import { isBannerActive } from '../../utils/banner.mjs';

/** @import { BannerEntry, RemoteConfig } from './types.d.ts' */

/**
 * Fetches and returns active banners for the given version.
 * Returns an empty array until loaded or on any failure.
 *
 * @param {{ remoteConfig: string, versionMajor: number | null }} props
 * @returns {{ banners: BannerEntry[] }}
 */
export const useBanners = ({ remoteConfig, versionMajor }) => {
  const [banners, setBanners] = useState(/** @type {BannerEntry[]} */ ([]));

  useEffect(() => {
    if (!remoteConfig) {
      return;
    }

    /** @returns {Promise<void>} */
    const load = async () => {
      const res = await fetch(remoteConfig, {
        signal: AbortSignal.timeout(2500),
      });

      if (!res.ok) {
        return;
      }

      /** @type {RemoteConfig} */
      const config = await res.json();
      const active = [];

      const globalBanner = config.websiteBanners?.index;
      if (globalBanner && isBannerActive(globalBanner)) {
        active.push(globalBanner);
      }

      // no version info available, skip version-specific banner
      if (versionMajor != null) {
        const versionBanner = config.websiteBanners?.[`v${versionMajor}`];
        if (versionBanner && isBannerActive(versionBanner)) {
          active.push(versionBanner);
        }
      }

      setBanners(active);
    };

    load().catch(console.error);
  }, []);

  return { banners };
};
