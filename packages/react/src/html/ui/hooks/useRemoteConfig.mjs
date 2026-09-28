import { useEffect, useState } from 'react';

import { remoteConfigUrl } from '#theme/config';

/**
 * The site configuration fetched at runtime from `remoteConfigUrl`.
 *
 * Every key is optional: a remote config only overrides what it provides.
 *
 * @typedef {object} RemoteConfig
 * @property {Record<string, import('./useBanners.mjs').BannerEntry>} [websiteBanners]
 * Announcement banners, keyed by `index` (global) or `v{major}`.
 * @property {typeof import('#theme/config').versions} [versions]
 * Version entries for the version selector, in the same shape as the
 * build-time `versions` export. When present, they replace the build-time
 * list so that docs built for an older release still list current releases.
 */

/**
 * Fetches the remote site configuration once the component mounts.
 *
 * @returns {RemoteConfig | null} `null` until loaded, or when there is no
 * `remoteConfigUrl` or the fetch fails.
 */
export default () => {
  const [config, setConfig] = useState(
    /** @type {RemoteConfig | null} */ (null)
  );

  useEffect(() => {
    if (!remoteConfigUrl) {
      return;
    }

    let mounted = true;

    fetch(remoteConfigUrl)
      .then(response => response.json())
      .then(loaded => {
        if (mounted) {
          setConfig(loaded);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return config;
};
