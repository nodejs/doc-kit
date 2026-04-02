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

/**
 * @deprecated This is being exported temporarily during the transition period.
 * For a more general solution, category information should be added to pages in
 * YAML format, and this array should be removed.
 *
 * Defines the sidebar navigation groups and their associated page URLs.
 * @type {Array<{ groupName: string, items: Array<string> }>}
 */
export const SIDEBAR_GROUPS = [
  {
    groupName: 'Getting Started',
    items: [
      'documentation.html',
      'synopsis.html',
      'cli.html',
      'environment_variables.html',
      'globals.html',
    ],
  },
  {
    groupName: 'Module System',
    items: [
      'modules.html',
      'esm.html',
      'module.html',
      'packages.html',
      'typescript.html',
    ],
  },
  {
    groupName: 'Networking & Protocols',
    items: [
      'http.html',
      'http2.html',
      'https.html',
      'net.html',
      'dns.html',
      'dgram.html',
      'quic.html',
    ],
  },
  {
    groupName: 'File System & I/O',
    items: [
      'fs.html',
      'path.html',
      'buffer.html',
      'stream.html',
      'string_decoder.html',
      'zlib.html',
      'readline.html',
      'tty.html',
    ],
  },
  {
    groupName: 'Asynchronous Programming',
    items: [
      'async_context.html',
      'async_hooks.html',
      'events.html',
      'timers.html',
      'webstreams.html',
    ],
  },
  {
    groupName: 'Process & Concurrency',
    items: [
      'process.html',
      'child_process.html',
      'cluster.html',
      'worker_threads.html',
      'os.html',
    ],
  },
  {
    groupName: 'Security & Cryptography',
    items: ['crypto.html', 'webcrypto.html', 'permissions.html', 'tls.html'],
  },
  {
    groupName: 'Data & URL Utilities',
    items: ['url.html', 'querystring.html', 'punycode.html', 'util.html'],
  },
  {
    groupName: 'Debugging & Diagnostics',
    items: [
      'debugger.html',
      'inspector.html',
      'console.html',
      'report.html',
      'tracing.html',
      'diagnostics_channel.html',
      'errors.html',
    ],
  },
  {
    groupName: 'Testing & Assertion',
    items: ['test.html', 'assert.html', 'repl.html'],
  },
  {
    groupName: 'Performance & Observability',
    items: ['perf_hooks.html', 'v8.html'],
  },
  {
    groupName: 'Runtime & Advanced APIs',
    items: [
      'vm.html',
      'wasi.html',
      'sqlite.html',
      'single-executable-applications.html',
      'intl.html',
    ],
  },
  {
    groupName: 'Native & Low-level Extensions',
    items: ['addons.html', 'n-api.html', 'embedding.html'],
  },
  {
    groupName: 'Legacy & Deprecated',
    items: ['deprecations.html', 'domain.html'],
  },
];
