import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Banner from '@node-core/ui-components/Common/Banner';

import useBanners from '../hooks/useBanners.mjs';

import { remoteConfigUrl, version } from '#theme/config';

const Banners = () => {
  const [banner, dismissBanner] = useBanners(remoteConfigUrl, version.major);

  return (
    banner && (
      <Banner
        key={banner.section}
        type={banner.type}
        onClose={() => dismissBanner(banner)}
      >
        {banner.link ? (
          <a href={banner.link} target="_blank" rel="noopener noreferrer">
            {banner.text}
          </a>
        ) : (
          banner.text
        )}
        {banner.link && <ArrowUpRightIcon />}
      </Banner>
    )
  );
};

export default Banners;
