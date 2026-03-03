import { minify } from '@swc/html-wasm';

/**
 * Minifies HTML with project defaults and optional overrides. At the moment,
 * swc's defaults are suitable for our needs, but in the event that this changes,
 * allowing project defaults is beneficial.
 *
 * @param {string} html
 * @param {import('@swc/html-wasm').Options} [options]
 */
export const minifyHTML = async (html, options = {}) =>
  minify(html, options).then(({ code }) => code)
