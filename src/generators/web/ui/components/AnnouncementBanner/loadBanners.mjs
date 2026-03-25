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
  if (!remoteConfig) {
    return [];
  }

  try {
    const res = await fetch(remoteConfig, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      return [];
    }

    /** @type {RemoteConfig} */
    const { websiteBanners = {} } = await res.json();

    const keys = ['index', versionMajor != null && `v${versionMajor}`].filter(
      Boolean
    );

    return keys
      .map(key => websiteBanners[key])
      .filter(banner => banner && isBannerActive(banner));
  } catch {
    return [];
  }
};
