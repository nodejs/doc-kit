import { isBannerActive } from '../../utils/banner.mjs';

/**
 * Fetches and returns active banners for the given version.
 * Returns an empty array when remoteConfigUrl is absent, the response is not ok,
 * or on any fetch/parse failure.
 *
 * @param {string | undefined} remoteConfigUrl
 * @param {number | null} versionMajor
 * @returns {Promise<Array<import('./types.d.ts').BannerEntry>>}
 */
export const loadBanners = async (remoteConfigUrl, versionMajor) => {
  if (!remoteConfigUrl) {
    return [];
  }

  try {
    const res = await fetch(remoteConfigUrl);

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
