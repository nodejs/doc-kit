import { isBannerActive } from '../../utils/banner.mjs';

/**
 * Fetches and returns active banners for the given version.
 * Returns an empty array when remoteConfig is absent, the response is not ok,
 * or on any fetch/parse failure.
 *
 * @param {string | undefined} remoteConfig
 * @param {number | null} versionMajor
 * @returns {Promise<import('./types.d.ts').BannerEntry[]>}
 */
export const loadBanners = async (remoteConfig, versionMajor) => {
  if (!remoteConfig) {
    return [];
  }

  try {
    const res = await fetch(remoteConfig);

    /** @type {import('./types.d.ts').RemoteConfig} */
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
