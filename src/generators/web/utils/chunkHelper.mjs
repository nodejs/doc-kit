/**
 * Creates an enhanced require function that can resolve code-split chunks
 * from a virtual file system before falling back to Node.js require.
 *
 * @param {Array<{fileName: string, code: string}>} jsChunks - Array of code-split chunks from bundler.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - Node.js require function for external packages.
 */
export function createEnhancedRequire(jsChunks, requireFn) {
  // Create a virtual file system from code-split chunks
  const chunkModules = Object.fromEntries(
    jsChunks.map(c => [`./${c.fileName}`, c.code])
  );

  /**
   * Enhanced require function that resolves code-split chunks from virtual file system.
   *
   * @param {string} modulePath - Module path to require.
   * @returns {*} Module exports.
   */
  const chunkedRequire = modulePath => {
    // Check virtual file system first for code-split chunks
    if (chunkModules[modulePath]) {
      const mod = { exports: {} };

      // Execute chunk code in isolated context with its own module.exports
      const chunkFn = new Function(
        'module',
        'exports',
        'require',
        chunkModules[modulePath]
      );

      chunkFn(mod, mod.exports, chunkedRequire);

      return mod.exports;
    }

    // Fall back to Node.js require for external packages
    return requireFn(modulePath);
  };

  return chunkedRequire;
}
