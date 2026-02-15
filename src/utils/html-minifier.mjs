import { minify } from 'html-minifier-terser';

const DEFAULT_HTML_MINIFIER_OPTIONS = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  minifyCSS: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
};

/**
 * Minifies HTML with project defaults and optional overrides.
 *
 * @param {string} html
 * @param {import('html-minifier-terser').Options} [overrides]
 */
export const minifyHTML = (html, overrides = {}) =>
  minify(html, { ...DEFAULT_HTML_MINIFIER_OPTIONS, ...overrides });
