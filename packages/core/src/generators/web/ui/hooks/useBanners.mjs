import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'banner-dismissal';

/**
 * @typedef {object} BannerEntry
 * @property {string} text
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string} [link]
 * @property {'default' | 'warning' | 'error'} [type]
 */

/**
 * @typedef {BannerEntry & { section: string }} ActiveBanner
 */

/**
 * The global banner uses the same key as nodejs.org.
 *
 * @param {string} section
 */
const getStorageKey = section =>
  section === 'index' ? STORAGE_KEY : `${STORAGE_KEY}-${section}`;

/**
 * Checks whether a banner should be displayed based on its date range.
 *
 * @param {BannerEntry} banner
 */
export const isBannerActive = ({ startDate, endDate }) => {
  const now = Date.now();

  return (
    (!startDate || now >= new Date(startDate)) &&
    (!endDate || now <= new Date(endDate))
  );
};

/**
 * Fetches the first active banner, preferring the global banner over
 * the version-specific one.
 *
 * @param {string | undefined} remoteConfigUrl
 * @param {number | null} versionMajor
 * @returns {Promise<ActiveBanner | null>}
 */
export const loadBanner = async (remoteConfigUrl, versionMajor) => {
  if (!remoteConfigUrl) {
    return null;
  }

  const response = await fetch(remoteConfigUrl);

  /** @type {{ websiteBanners?: Record<string, BannerEntry> }} */
  const { websiteBanners = {} } = await response.json();

  const sections =
    versionMajor == null ? ['index'] : ['index', `v${versionMajor}`];

  for (const section of sections) {
    const banner = websiteBanners[section];

    if (banner && isBannerActive(banner)) {
      return { ...banner, section };
    }
  }

  return null;
};

/**
 * Checks whether the current text of a banner was dismissed.
 *
 * @param {ActiveBanner} banner
 */
export const isBannerDismissed = banner =>
  localStorage.getItem(getStorageKey(banner.section)) === banner.text;

/**
 * Persists a banner dismissal.
 *
 * @param {ActiveBanner} banner
 */
export const saveBannerDismissal = banner =>
  localStorage.setItem(getStorageKey(banner.section), banner.text);

/**
 * Loads, filters, and dismisses the announcement banner.
 *
 * @param {string | undefined} remoteConfigUrl
 * @param {number | null} versionMajor
 * @returns {[ActiveBanner | null, () => void]}
 */
export default (remoteConfigUrl, versionMajor) => {
  const [banner, setBanner] = useState(
    /** @type {ActiveBanner | null} */ (null)
  );

  useEffect(() => {
    let mounted = true;

    loadBanner(remoteConfigUrl, versionMajor)
      .then(loaded => {
        if (mounted) {
          setBanner(loaded && !isBannerDismissed(loaded) ? loaded : null);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [remoteConfigUrl, versionMajor]);

  const dismissBanner = useCallback(() => {
    setBanner(current => {
      if (current) {
        saveBannerDismissal(current);
      }

      return null;
    });
  }, []);

  return [banner, dismissBanner];
};
