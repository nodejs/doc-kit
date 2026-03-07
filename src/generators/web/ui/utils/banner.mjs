/** @import { BannerEntry } from '../components/AnnouncementBanner/types' */

/**
 * Checks whether a banner should be displayed based on its date range.
 * Both `startDate` and `endDate` are optional; if omitted the banner is
 * considered open-ended in that direction.
 *
 * @param {BannerEntry} banner
 * @returns {boolean}
 */
export const isBannerActive = banner => {
  const now = Date.now();
  if (banner.startDate && now < new Date(banner.startDate).getTime()) {
    return false;
  }
  if (banner.endDate && now > new Date(banner.endDate).getTime()) {
    return false;
  }
  return true;
};
