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
 * An object containing mappings for various JSX components to their import paths.
 */
export const JSX_IMPORTS = {
  Layout: {
    name: 'Layout',
    source: '#theme/Layout',
  },
  CodeBox: {
    name: 'CodeBox',
    source: resolve(ROOT, './ui/components/CodeBox'),
  },
  CodeTabs: {
    name: 'CodeTabs',
    source: resolve(ROOT, './ui/components/CodeTabs'),
  },
  DocumentationIndex: {
    name: 'DocumentationIndex',
    source: resolve(ROOT, './ui/components/DocumentationIndex'),
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
  Badge: {
    name: 'Badge',
    source: '@node-core/ui-components/Common/Badge',
  },
  Blockquote: {
    name: 'Blockquote',
    source: '@node-core/ui-components/Common/Blockquote',
  },
  DataTag: {
    name: 'DataTag',
    source: '@node-core/ui-components/Common/DataTag',
  },
  FunctionSignature: {
    name: 'FunctionSignature',
    source: '@node-core/ui-components/Containers/FunctionSignature',
  },
  ArrowUpRightIcon: {
    name: 'ArrowUpRightIcon',
    source: '@heroicons/react/24/solid/ArrowUpRightIcon',
  },
};

/**
 * The bindings a page program imports from the component library for its JSX,
 * and which the bundler's `compile` must target (classic runtime): every
 * `<tag>` becomes a `_jsx(...)` call, every `<>` a `_Fragment`.
 */
export const JSX_PRAGMA = '_jsx';
export const JSX_PRAGMA_FRAG = '_Fragment';

/**
 * Fonts to preload, by the name of their source file. The bundler hashes them
 * like any other asset, so the files it emits are looked up by these names.
 */
export const FONTS = [
  'open-sans-latin-wght-normal.woff2',
  'open-sans-latin-wght-italic.woff2',
  'ibm-plex-mono-latin-400-normal.woff2',
];
