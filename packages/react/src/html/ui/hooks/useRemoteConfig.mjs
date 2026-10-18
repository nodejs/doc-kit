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
 * The remote config fetched for this visit, shared by every island that reads
 * it. Islands hydrate as separate roots, so no context provider could span
 * them; module scope is the shared store.
 *
 * @type {Promise<RemoteConfig | undefined> | undefined}
 */
let remoteConfig;

/**
 * Fetches the remote config, unless it is already loaded or on its way.
 *
 * @returns {Promise<RemoteConfig | null>}
 */
const loadRemoteConfig = () => {
  remoteConfig ??= fetch(remoteConfigUrl)
    .then(response => response.json())
    .catch(() => {
      // Not kept, so that the next island to mount tries again
      remoteConfig = undefined;
    });

  return remoteConfig;
};

/**
 * Fetches the remote site configuration once the component mounts.
 *
 * @returns {RemoteConfig | undefined} `undefined` until loaded, or when there
 * is no `remoteConfigUrl` or the fetch fails.
 */
export default () => {
  const [config, setConfig] = useState(
    /** @type {RemoteConfig | undefined} */ (undefined)
  );

  // A layout effect, so that a page navigated to client-side renders with a
  // config loaded earlier before it is painted, and its banner does not push
  // the page down a frame later
  useLayoutEffect(() => {
    if (!remoteConfigUrl) {
      return;
    }

    let mounted = true;

    loadRemoteConfig().then(loaded => {
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
