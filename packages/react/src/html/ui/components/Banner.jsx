import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import Banner from '@node-core/ui-components/Common/Banner';

import useBanners from '../hooks/useBanners.mjs';
import useRemoteConfig from '../hooks/useRemoteConfig.mjs';
import withIsland from '../islands/withIsland.jsx';

import { version } from '#theme/config';

const Banners = () => {
  const remote = useRemoteConfig();
  const [banner, dismissBanner] = useBanners(
    remote?.websiteBanners,
    version.major
  );

  return (
    banner && (
      <Banner
        key={banner.section}
        type={banner.type}
        aria-label="Announcement"
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

export default withIsland(Banners, { name: 'Banner', on: { idle: true } });
