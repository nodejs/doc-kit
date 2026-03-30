import { lazy, Suspense } from 'preact/compat';
import { useMemo } from 'preact/hooks';

import AnnouncementBanner from './AnnouncementBanner.jsx';
import { loadBanners } from './loadBanners.mjs';

/**
 * @param {{ remoteConfig: string, versionMajor: number | null }} props
 */
const RemoteLoadableBanner = ({ remoteConfig, versionMajor }) => {
  const LazyBanners = useMemo(
    () =>
      lazy(async () => {
        const active = await loadBanners(remoteConfig, versionMajor);

        if (!active.length) {
          return { default: () => null };
        }

        return { default: () => <AnnouncementBanner banners={active} /> };
      }),
    []
  );

  return (
    <Suspense fallback={null}>
      <LazyBanners />
    </Suspense>
  );
};

export default RemoteLoadableBanner;
