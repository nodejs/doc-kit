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

  const { createViteBundler } = await import('./vite.mjs');
  return createViteBundler();
};
