import { lazy, Suspense } from 'preact/compat';

import AnnouncementBanner from './AnnouncementBanner.jsx';
import { loadBanners } from './loadBanners.mjs';

import { remoteConfig, versionMajor } from '#theme/config';

// TODO: Revisit SERVER global usage.
const LazyBanners = SERVER
  ? null
  : lazy(async () => {
      const active = await loadBanners(remoteConfig, versionMajor);

      if (!active.length) {
        return { default: () => null };
      }

      return { default: () => <AnnouncementBanner banners={active} /> };
    });

const RemoteLoadableBanner = SERVER
  ? () => <div />
  : () => (
      <div>
        <Suspense fallback={null}>
          <LazyBanners />
        </Suspense>
      </div>
    );

export default RemoteLoadableBanner;
