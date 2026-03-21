/** @import { BannerEntry } from '../components/AnnouncementBanner/types' */

/**
 * Checks whether a banner should be displayed based on its date range.
 * Both `startDate` and `endDate` are optional; if omitted the banner is
 * considered open-ended in that direction.
 *
 * @param {BannerEntry} banner
 * @returns {boolean}
 */
export const isBannerActive = ({ startDate, endDate }) => {
  const now = Date.now();
  return (
    (!startDate || now >= new Date(startDate)) &&
    (!endDate || now <= new Date(endDate))
  );
};
