/**
 * Returns the configured bundler, or the default Vite adapter, which runs in a
 * child process of its own (see `child.mjs`).
 *
 * @param {import('../types').WebBundler|undefined} bundler
 * @returns {Promise<import('../types').WebBundler>}
 */
export const resolveBundler = async bundler => {
  if (bundler) {
    return bundler;
  }

  const { createChildBundler } = await import('./child.mjs');
  return createChildBundler();
};
