import { useCallback, useMemo, useState } from 'react';

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
 * Finds the first active banner, preferring the global banner over
 * the version-specific one.
 *
 * @param {Record<string, BannerEntry> | undefined} websiteBanners
 * @param {number | null} versionMajor
 * @returns {ActiveBanner | null}
 */
export const findBanner = (websiteBanners = {}, versionMajor) => {
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
 * Selects, filters, and dismisses the announcement banner.
 *
 * @param {Record<string, BannerEntry> | undefined} websiteBanners
 * @param {number | null} versionMajor
 * @returns {[ActiveBanner | null, () => void]}
 */
export default (websiteBanners, versionMajor) => {
  // Only re-renders the banner away; the dismissal itself lives in storage
  const [dismissed, setDismissed] = useState(false);

  const found = useMemo(
    () => (websiteBanners ? findBanner(websiteBanners, versionMajor) : null),
    [websiteBanners, versionMajor]
  );

  // `found` is only set client-side, once the remote config has loaded
  const banner =
    found && !dismissed && !isBannerDismissed(found) ? found : null;

  const dismissBanner = useCallback(() => {
    if (found) {
      saveBannerDismissal(found);
    }

    setDismissed(true);
  }, [found]);

  return [banner, dismissBanner];
};
