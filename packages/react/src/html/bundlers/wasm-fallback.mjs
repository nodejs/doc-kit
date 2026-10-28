import { createRequire, registerHooks } from 'node:module';

const viteRequire = createRequire(import.meta.resolve('vite'));

try {
  viteRequire('lightningcss');
} catch {
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
