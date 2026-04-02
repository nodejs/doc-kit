import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

import { jsx, toJs } from 'estree-util-to-js';
import { transform } from 'lightningcss-wasm';

import bundleCode from './bundle.mjs';
import { createChunkedRequire } from './chunks.mjs';
import createConfigSource from './config.mjs';
import createASTBuilder from './generate.mjs';
import { relativeOrAbsolute } from './relativeOrAbsolute.mjs';
import getConfig from '../../../utils/configuration/index.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';
import { minifyHTML } from '../../../utils/html-minifier.mjs';
import { SPECULATION_RULES } from '../constants.mjs';

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
 * Converts JSX AST entries to server and client JavaScript code.
 *
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} entries - JSX AST entries
 * @param {function} buildServerProgram - Wraps code for server execution
 * @param {function} buildClientProgram - Wraps code for client hydration
 * @returns {{serverCodeMap: Map<string, string>, clientCodeMap: Map<string, string>}}
 */
function convertJSXToCode(entries, { buildServerProgram, buildClientProgram }) {
  const serverCodeMap = new Map();
  const clientCodeMap = new Map();

  for (const entry of entries) {
    const fileName = `${entry.data.api}.jsx`;

    // Convert AST to JavaScript string with JSX syntax
    const { value: code } = toJs(entry, { handlers: jsx });

    // Prepare code for server-side execution (wrapped for SSR)
    serverCodeMap.set(fileName, buildServerProgram(code));

    // Prepare code for client-side execution (wrapped for hydration)
    clientCodeMap.set(fileName, buildClientProgram(code));
  }

  return { serverCodeMap, clientCodeMap };
}

/**
 * Bundles and executes server-side code, returning dehydrated HTML pages.
 *
 * @param {Map<string, string>} serverCodeMap - Map of fileName to server-side JavaScript code.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - Node.js require function for external packages.
 * @param {Object} virtualImports - virtual imports to pass to Rolldown
 * @returns {{ pages: Map<string, string>, css: string }}
 */
async function executeServerCode(serverCodeMap, requireFn, virtualImports) {
  // Bundle all server-side code, which may produce code-split chunks
  const { chunks, css } = await bundleCode(serverCodeMap, virtualImports, {
    server: true,
  });

  const entryChunks = chunks.filter(c => c.isEntry);
  const otherChunks = chunks.filter(c => !c.isEntry);

  // Create enhanced require function that can resolve code-split chunks
  const enhancedRequire = createChunkedRequire(otherChunks, requireFn);

  const pages = new Map();

  // Execute each bundled entry and collect dehydrated HTML results
  for (const chunk of entryChunks) {
    const executedFunction = new Function('require', chunk.code);
    pages.set(chunk.fileName, await executedFunction(enhancedRequire));
  }

  return { pages, css };
}

/**
 * Processes JSX AST entries into complete HTML pages, client JS bundles, and CSS.
 *
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} entries - The JSX AST entries to process.
 * @param {string} template - The HTML template string for the output pages.
 */
export async function processJSXEntries(entries, template) {
  const config = getConfig('web');
  const astBuilders = createASTBuilder();
  const requireFn = createRequire(import.meta.url);
  const virtualImports = {
    '#theme/config': createConfigSource(entries),
    ...config.virtualImports,
  };
  // Step 1: Convert JSX AST to JavaScript
  const { serverCodeMap, clientCodeMap } = convertJSXToCode(
    entries,
    astBuilders
  );

  // Step 2: Bundle server and client code in parallel
  // Both need all entries for code-splitting, but are independent of each other
  const [serverBundle, clientBundle] = await Promise.all([
    executeServerCode(serverCodeMap, requireFn, virtualImports),
    bundleCode(clientCodeMap, virtualImports),
  ]);

  const titleSuffix = populate(config.title, {
    ...config,
    version: config.version.version,
  });

  // Step 3: Render final HTML pages
  const results = await Promise.all(
    entries.map(async ({ data }) => {
      const unresolvedRoot = relativeOrAbsolute('/', data.path);
      const root = unresolvedRoot.endsWith('/')
        ? unresolvedRoot
        : `${unresolvedRoot}/`;

      // Replace template placeholders with actual content
      const renderedHtml = populateWithEvaluation(template, {
        title: `${data.heading.data.name} | ${titleSuffix}`,
        dehydrated: serverBundle.pages.get(`${data.api}.js`) ?? '',
        importMap: clientBundle.importMap?.replaceAll('/', root) ?? '',
        entrypoint: `${data.api}.js?${randomUUID()}`,
        speculationRules: SPECULATION_RULES,
        root,
        metadata: data,
        config,
      });

      return { html: await minifyHTML(renderedHtml), path: data.path };
    })
  );

  const { code: minifiedCSS } = transform({
    code: Buffer.from(`${serverBundle.css}\n${clientBundle.css}`),
    minify: true,
  });

  return { results, chunks: clientBundle.chunks, css: minifiedCSS };
}
