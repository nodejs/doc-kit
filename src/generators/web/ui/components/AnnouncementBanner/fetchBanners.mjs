/** @import { BannerEntry, RemoteConfig } from './types.d.ts' */

import { isBannerActive } from '../../utils/banner.mjs';

/**
 * Fetches and returns active banners for the given version from the remote config.
 * Returns an empty array on any fetch or parse failure.
 *
 * @param {string} remoteConfig
 * @param {number | null} versionMajor
 * @returns {Promise<BannerEntry[]>}
 */
export const fetchBanners = async (remoteConfig, versionMajor) => {
  const res = await fetch(remoteConfig, { signal: AbortSignal.timeout(2500) });

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
};
