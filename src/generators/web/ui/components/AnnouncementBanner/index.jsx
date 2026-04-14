import { lazy, Suspense } from 'preact/compat';

import AnnouncementBanner from './AnnouncementBanner.jsx';
import { loadBanners } from './loadBanners.mjs';

import { remoteConfig, version } from '#theme/config';

// TODO: Revisit SERVER global usage (https://github.com/nodejs/doc-kit/issues/353)
const LazyBanners = SERVER
  ? null
  : lazy(async () => {
      const active = await loadBanners(remoteConfig, version.major);

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
