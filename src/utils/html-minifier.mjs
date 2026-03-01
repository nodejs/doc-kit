import { readFile } from 'node:fs/promises';

import { minify, default as initSync } from '@swc/html-wasm';

// See https://github.com/swc-project/swc/issues/11599 for why we need to load
// the WASM file in this way
await initSync(
  readFile(new URL(import.meta.resolve('@swc/html-wasm/wasm_bg.wasm')))
);

/**
 * Minifies HTML with project defaults and optional overrides. At the moment,
 * swc's defaults are suitable for our needs, but in the event that this changes,
 * allowing project defaults is beneficial.
 *
 * @param {string} html
 * @param {import('@swc/html-wasm').Options} [options]
 */
export const minifyHTML = async (html, options = {}) =>
  (await minify(html, options)).code;
