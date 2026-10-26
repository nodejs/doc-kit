import getConfig from '@doc-kit/core/utils/configuration/index.mjs';

import { BUNDLER_THREAD_VARIABLES } from '../constants.mjs';

/**
 * Returns the configured bundler or lazily creates the default Vite adapter.
 *
 * @param {import('../types').WebBundler|undefined} bundler
 * @returns {Promise<import('../types').WebBundler>}
 */
export const resolveBundler = async bundler => {
  if (bundler) {
    return bundler;
  }

  // Vite's native thread pools (rolldown, lightningcss) otherwise start a
  // thread per CPU, each holding memory of its own
  const threads = String(getConfig().threads);

  for (const name of BUNDLER_THREAD_VARIABLES) {
    process.env[name] ??= threads;
  }

  // rolldown's allocator only returns freed memory on its next call past this
  // delay, which never comes once bundling ends, so it returns it right away,
  // and not in huge pages, which it only returns once they're entirely free
  process.env.MIMALLOC_PURGE_DELAY ??= '0';
  process.env.MIMALLOC_ALLOW_THP ??= '0';

  const { createViteBundler } = await import('./vite.mjs');
  return createViteBundler();
};
