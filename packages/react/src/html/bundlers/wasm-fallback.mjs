import { registerHooks } from 'node:module';

if (process.arch === 'ppc64' || process.arch === 's390x') {
  const url = import.meta.resolve('lightningcss-wasm');

  registerHooks({
    /**
     * Resolves `lightningcss` to `lightningcss-wasm`.
     *
     * @type {import('node:module').ResolveHookSync}
     */
    resolve: (specifier, context, nextResolve) =>
      specifier === 'lightningcss'
        ? { url, format: 'module', shortCircuit: true }
        : nextResolve(specifier, context),
  });
}
