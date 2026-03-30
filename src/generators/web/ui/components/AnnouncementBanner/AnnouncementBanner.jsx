import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Banner from '@node-core/ui-components/Common/Banner';

import styles from './index.module.css';

/** @import { BannerEntry } from './types.d.ts' */

/**
 * @param {{ banners: BannerEntry[] }} props
 */
const AnnouncementBanner = ({ banners }) => (
  <div role="region" aria-label="Announcements" className={styles.banners}>
    {banners.map(banner => (
      <Banner key={banner.text} type={banner.type}>
        {banner.link ? (
          <a href={banner.link} target="_blank" rel="noopener noreferrer">
            {banner.text}
          </a>
        ) : (
          banner.text
        )}
        {banner.link && <ArrowUpRightIcon />}
      </Banner>
    ))}
  </div>
);

export default AnnouncementBanner;
