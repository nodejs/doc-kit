import { useState, useEffect } from 'preact/hooks';

import AnnouncementBanner from './AnnouncementBanner.jsx';
import { loadBanners } from './loadBanners.mjs';

import { remoteConfig, versionMajor } from '#theme/config';

const RemoteLoadableBanner = () => {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    loadBanners(remoteConfig, versionMajor).then(active => {
      if (active.length) {
        setBanners(active);
      }
    });
  }, []);

  return banners.length ? <AnnouncementBanner banners={banners} /> : null;
};

export default RemoteLoadableBanner;
