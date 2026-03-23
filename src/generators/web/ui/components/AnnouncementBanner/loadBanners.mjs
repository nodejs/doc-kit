import { isBannerActive } from '../../utils/banner.mjs';

/** @import { BannerEntry, RemoteConfig } from './types.d.ts' */

/**
 * Fetches and returns active banners for the given version.
 * Returns an empty array when remoteConfig is absent, the response is not ok,
 * or on any fetch/parse failure.
 *
 * @param {string | undefined} remoteConfig
 * @param {number | null} versionMajor
 * @returns {Promise<BannerEntry[]>}
 */
export const loadBanners = async (remoteConfig, versionMajor) => {
  try {
    if (!remoteConfig) {
      return [];
    }

    const res = await fetch(remoteConfig, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return [];
    }

    /** @type {RemoteConfig} */
    const config = await res.json();
    const active = [];

    const globalBanner = config.websiteBanners?.index;
    if (globalBanner && isBannerActive(globalBanner)) {
      active.push(globalBanner);
    }

    if (versionMajor != null) {
      const versionBanner = config.websiteBanners?.[`v${versionMajor}`];
      if (versionBanner && isBannerActive(versionBanner)) {
        active.push(versionBanner);
      }
    }

    return active;
  } catch {
    return [];
  }
};
