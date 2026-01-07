import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * @typedef {Object} JSXImportConfig
 * @property {string} name - The name of the component to be imported.
 * @property {string} source - The path to the component's source file or package.
 * @property {boolean} [isDefaultExport=true] - Indicates if it's a default export (true) or named export (false). Defaults to true if not specified.
 */

/**
 * @type {Record<string, JSXImportConfig>}
 * An object containing mappings for various JSX components to their import paths.
 */
export const JSX_IMPORTS = {
  NavBar: {
    name: 'NavBar',
    source: resolve(ROOT, './ui/components/NavBar'),
  },
  SideBar: {
    name: 'SideBar',
    source: resolve(ROOT, './ui/components/SideBar'),
  },
  MetaBar: {
    name: 'MetaBar',
    source: resolve(ROOT, './ui/components/MetaBar'),
  },
  CodeBox: {
    name: 'CodeBox',
    source: resolve(ROOT, './ui/components/CodeBox'),
  },
  CodeTabs: {
    name: 'CodeTabs',
    source: '@node-core/ui-components/MDX/CodeTabs',
  },
  MDXTooltip: {
    name: 'MDXTooltip',
    isDefaultExport: false,
    source: '@node-core/ui-components/MDX/Tooltip',
  },
  MDXTooltipContent: {
    name: 'MDXTooltipContent',
    isDefaultExport: false,
    source: '@node-core/ui-components/MDX/Tooltip',
  },
  MDXTooltipTrigger: {
    name: 'MDXTooltipTrigger',
    isDefaultExport: false,
    source: '@node-core/ui-components/MDX/Tooltip',
  },
  ChangeHistory: {
    name: 'ChangeHistory',
    source: '@node-core/ui-components/Common/ChangeHistory',
  },
  AlertBox: {
    name: 'AlertBox',
    source: '@node-core/ui-components/Common/AlertBox',
  },
  Article: {
    name: 'Article',
    source: '@node-core/ui-components/Containers/Article',
  },
  Blockquote: {
    name: 'Blockquote',
    source: '@node-core/ui-components/Common/Blockquote',
  },
  DataTag: {
    name: 'DataTag',
    source: '@node-core/ui-components/Common/DataTag',
  },
  ArrowUpRightIcon: {
    name: 'ArrowUpRightIcon',
    source: '@heroicons/react/24/solid/ArrowUpRightIcon',
  },
};

/**
 * Specification rules for resource hints like prerendering and prefetching.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API
 */
export const SPECULATION_RULES = JSON.stringify({
  // Eagerly prefetch all links that point to the API docs themselves
  // in a moderate eagerness to improve resource loading
  prefetch: [{ where: { href_matches: '/*' }, eagerness: 'eager' }],
  prerender: [
    // Eagerly prerender Sidebar links for faster navigation
    // These will be done in a moderate eagerness (hover, likely next navigation)
    { where: { selector_matches: '[rel~=prefetch]' }, eagerness: 'moderate' },
  ],
});
