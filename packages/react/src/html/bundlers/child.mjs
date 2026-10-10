import createChildProcess from '@doc-kit/core/threading/child-process.mjs';

/**
 * Runs the Vite adapter in a child process of its own, behind the same
 * contract (see `WebBundler`).
 *
 * Vite bundles with Rolldown, whose native memory a process only gets back
 * when it exits: building the Node.js docs leaves ~250MB of it behind. In a
 * child, it is all returned once the page programs are compiled (`close`),
 * before the pages are rendered, and the generator's own process never loads
 * Vite at all.
 *
 * @returns {import('../types').WebBundler}
 */
export const createChildBundler = () => {
  /** @type {import('@doc-kit/core/threading/types').ChildProcess<typeof import('./vite.mjs')>} */
  const { rpc: vite, ...child } = createChildProcess(
    new URL('./vite.mjs', import.meta.url)
  );

  return {
    ...child,

    /** @param {import('../types').ServerBundleOptions} options */
    buildServer: options => vite.buildServer(options),

    /**
     * @param {string} code
     * @param {string} fileName
     */
    compile: (code, fileName) => vite.compile(code, fileName),

    /** @param {import('../types').ClientBundleOptions} options */
    buildClient: options => vite.buildClient(options),
  };
};
