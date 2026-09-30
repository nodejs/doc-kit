import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';

import createConfigSource from './config.mjs';
import { relativeOrAbsolute } from './relativeOrAbsolute.mjs';
import { FONT_DIRECTORY, FONTS, SPECULATION_RULES } from '../constants.mjs';
import { THEME_SCRIPT } from '../ui/theme-script.mjs';

/**
 * Creates the virtual imports for one bundle target.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} datas - Per-page metadata
 * @param {Record<string, string>} virtualImports
 * @param {boolean} server
 * @returns {Record<string, string>}
 */
export const createVirtualImports = (datas, virtualImports, server) => ({
  ...virtualImports,
  '#theme/config': createConfigSource(datas, server),
});

/**
 * Populates a template string by evaluating it as a JavaScript template literal,
 * allowing full JS expression syntax (e.g., ${if ...}, ${JSON.stringify(...)}).
 *
 * ONLY used for HTML template population. Do not use elsewhere.
 *
 * @param {string} template - The template string with ${...} placeholders
 * @param {Record<string, unknown>} config - The values available in the template
 * @returns {string} The populated template
 */
export const populateWithEvaluation = (template, config) => {
  const keys = Object.keys(config);
  const values = Object.values(config);
  const fn = new Function(...keys, `return \`${template}\`;`);
  return fn(...values);
};

/**
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} data
 * @returns {string}
 */
export const resolvePageRoot = data => {
  if (data.synthetic === true) {
    const { baseURL, useAbsoluteURLs } = getConfig('html');
    return useAbsoluteURLs ? String(baseURL).replace(/\/?$/, '/') : '/';
  }

  const unresolvedRoot = relativeOrAbsolute('/', data.path);
  return unresolvedRoot.endsWith('/') ? unresolvedRoot : `${unresolvedRoot}/`;
};

/**
 * Escapes text for interpolation into HTML, as element content or as a quoted
 * attribute value: a heading such as `What does it mean to "contextify" an
 * object?` must not terminate the `<meta content="...">` it is rendered into.
 *
 * @param {string} text
 * @returns {string}
 */
export const escapeHTML = text =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * Renders a self-closing HTML tag from an attribute bag.
 *
 * Boolean `true` renders a valueless attribute (e.g. `crossorigin`); `false`,
 * `null`, and `undefined` are omitted; all other values are stringified.
 *
 * @param {string} tag - The tag name (e.g. `'meta'`, `'link'`).
 * @param {Record<string, unknown>} attrs - Attribute name/value pairs.
 * @returns {string} The rendered tag.
 */
const renderTag = (tag, attrs) => {
  const rendered = Object.entries(attrs)
    .filter(([, value]) => value != null && value !== false)
    .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${value}"`))
    .join('');

  return `<${tag}${rendered} />`;
};

/**
 * Renders the preload hints for a page
 */
export const buildPreloads = root =>
  FONTS.map(font =>
    renderTag('link', {
      rel: 'preload',
      href: `${root}${FONT_DIRECTORY}/${font}`,
      as: 'font',
      type: 'font/woff2',
      crossorigin: true,
    })
  ).join('\n  ');

/**
 * Builds the configurable `<head>` markup shared by every page from the
 * structured `head` config: `<meta>` tags, `<link>` tags, and raw HTML. None
 * of the rendered content is project-specific beyond the configured values.
 *
 * @param {import('../types').Configuration['head']} head - The `head` config.
 * @returns {string} The concatenated HTML for the document head.
 */
export const buildHead = ({ meta = [], links = [], html = [] }) =>
  [
    ...meta.map(attrs => renderTag('meta', attrs)),
    ...links.map(attrs => renderTag('link', attrs)),
    ...html,
  ].join('\n  ');

/**
 * Renders the tags that load a page's client assets, each resolved against
 * the page's root: the entry scripts as module scripts, the chunks they
 * statically import as preload hints (as the bundler would inject them), and
 * the stylesheets as links.
 *
 * @param {import('../types').ClientAssets} assets - Output-relative asset paths
 * @param {string} root - The page's root (see {@link resolvePageRoot})
 * @returns {string}
 */
export const buildAssetTags = ({ scripts, preloads, stylesheets }, root) =>
  [
    scripts.map(
      file => `<script type="module" crossorigin src="${root}${file}"></script>`
    ),
    preloads.map(file =>
      renderTag('link', {
        rel: 'modulepreload',
        crossorigin: true,
        href: `${root}${file}`,
      })
    ),
    stylesheets.map(file =>
      renderTag('link', {
        rel: 'stylesheet',
        crossorigin: true,
        href: `${root}${file}`,
      })
    ),
  ]
    .flat()
    .join('\n    ');

/**
 * The output file of a page, relative to the output directory.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} data
 */
export const pageFileName = data => `${data.path.replace(/^\/+/, '')}.html`;

/**
 * Populates the HTML template for one rendered page.
 *
 * @param {object} params
 * @param {string} params.template - The HTML template
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} params.data - The page's metadata
 * @param {string} params.dehydrated - The server-rendered page
 * @param {import('../types').ClientAssets} params.assets - The client assets every page loads
 * @returns {string}
 */
export const populatePage = ({ template, data, dehydrated, assets }) => {
  const config = getConfig('html');

  const titleSuffix = populate(config.title, {
    ...config,
    version: config.version.version,
  });

  const root = resolvePageRoot(data);
  const title = data.title ?? data.heading.data.name;

  return populateWithEvaluation(template, {
    title: escapeHTML(
      title ? (titleSuffix ? `${title} | ${titleSuffix}` : title) : titleSuffix
    ),
    dehydrated,
    assets: buildAssetTags(assets, root),
    speculationRules: SPECULATION_RULES,
    themeScript: THEME_SCRIPT,
    preloads: buildPreloads(root),
    root,
    metadata: data,
    config,
    head: buildHead(config.head),
  });
};
