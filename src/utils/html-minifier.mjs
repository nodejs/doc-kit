import { minify } from '@minify-html/wasm';

const DEFAULT_HTML_MINIFIER_OPTIONS = {
  minify_css: true,
  minify_js: true,
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Minifies HTML with project defaults and optional overrides.
 *
 * @param {string} html
 * @param {Record<string, boolean | number | string | string[]>} [overrides]
 */
export const minifyHTML = async (html, overrides = {}) => {
  const minified = minify(textEncoder.encode(html), {
    ...DEFAULT_HTML_MINIFIER_OPTIONS,
    ...overrides,
  });

  return textDecoder.decode(minified);
};
