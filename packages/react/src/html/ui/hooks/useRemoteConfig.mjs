import { useLayoutEffect, useState } from 'react';

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
 * The remote configs fetched so far, by URL. Each is fetched once per visit and
 * shared by every island that reads it, on every page navigated to client-side:
 * islands hydrate as separate roots, so no context provider could span them.
 *
 * @type {Map<string, Promise<RemoteConfig | null>>}
 */
const remoteConfigs = new Map();

/**
 * Fetches a remote config, unless it is already loaded or on its way.
 *
 * @param {string} url
 * @returns {Promise<RemoteConfig | null>}
 */
const loadRemoteConfig = url => {
  if (!remoteConfigs.has(url)) {
    remoteConfigs.set(
      url,
      fetch(url)
        .then(response => response.json())
        .catch(() => {
          // Not kept, so that the next island to mount tries again
          remoteConfigs.delete(url);

          return null;
        })
    );
  }

  return remoteConfigs.get(url);
};

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

  // A layout effect, so that a page navigated to client-side renders with a
  // config loaded earlier before it is painted, and its banner does not push
  // the page down a frame later
  useLayoutEffect(() => {
    if (!remoteConfigUrl) {
      return;
    }

    let mounted = true;

    loadRemoteConfig(remoteConfigUrl).then(loaded => {
      if (mounted) {
        setConfig(loaded);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  return config;
};
