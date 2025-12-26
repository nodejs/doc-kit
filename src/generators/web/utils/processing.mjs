import { randomUUID } from 'node:crypto';

import { minifySync } from '@swc/html';
import { jsx, toJs } from 'estree-util-to-js';
import { transform } from 'lightningcss';

import { SPECULATION_RULES } from '../constants.mjs';
import bundleCode from './bundle.mjs';
import { createChunkedRequire } from './chunks.mjs';

/**
 * Converts JSX AST entries to server and client JavaScript code.
 * This is the CPU-intensive step that can be parallelized.
 *
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} entries - JSX AST entries
 * @param {function} buildServerProgram - Wraps code for server execution
 * @param {function} buildClientProgram - Wraps code for client hydration
 * @returns {{serverCodeMap: Map<string, string>, clientCodeMap: Map<string, string>}}
 */
export function convertJSXToCode(
  entries,
  { buildServerProgram, buildClientProgram }
) {
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
 * Executes server-side JavaScript code in an isolated context with virtual module support.
 *
 * Takes a map of server-side JavaScript code, bundles it (which may produce code-split chunks),
 * and executes each entry within a new Function constructor. Code-split chunks are made
 * available via an enhanced require function that loads them from an in-memory virtual file system.
 *
 * @param {Map<string, string>} serverCodeMap - Map of fileName to server-side JavaScript code.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - Node.js require function for external packages.
 * @returns {{ pages: Map<string, string>, css: string }} An object containing a Map of fileName to dehydrated (server-rendered) HTML content (`pages`), and a string of collected CSS (`css`).
 */
export async function executeServerCode(serverCodeMap, requireFn) {
  const dehydratedMap = new Map();

  // Bundle all server-side code, which may produce code-split chunks
  const { chunks, css } = await bundleCode(serverCodeMap, { server: true });

  const entryChunks = chunks.filter(c => c.isEntry);
  const otherChunks = chunks.filter(c => !c.isEntry);

  // Create enhanced require function that can resolve code-split chunks
  const enhancedRequire = createChunkedRequire(otherChunks, requireFn);

  // Execute each bundled entry and collect dehydrated HTML results
  for (const chunk of entryChunks) {
    // Create and execute function with enhanced require for chunk resolution
    const executedFunction = new Function('require', chunk.code);

    // Execute the function - result is the dehydrated HTML from server-side rendering
    dehydratedMap.set(chunk.fileName, executedFunction(enhancedRequire));
  }

  return { pages: dehydratedMap, css };
}

/**
 * Processes a single JSX AST (Abstract Syntax Tree) entry to generate a complete
 * HTML page, including server-side rendered content, client-side JavaScript, and CSS.
 *
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} entries - The JSX AST entry to process.
 * @param {string} template - The HTML template string that serves as the base for the output page.
 * @param {ReturnType<import('./generate.mjs')>} astBuilders - The AST generators
 * @param {ReturnType<import('node:module').createRequire>} requireFn - A Node.js `require` function.
 * @param {Object} options - Processing options
 * @param {Object} options.version - Version info
 */
export async function processJSXEntries(
  entries,
  template,
  astBuilders,
  requireFn,
  { version }
) {
  // Step 1: Convert JSX AST to JavaScript (CPU-intensive, could be parallelized)
  const { serverCodeMap, clientCodeMap } = convertJSXToCode(
    entries,
    astBuilders
  );

  // Step 2: Bundle server and client code IN PARALLEL
  // Both need all entries for code-splitting, but are independent of each other
  const [serverBundle, clientBundle] = await Promise.all([
    executeServerCode(serverCodeMap, requireFn),
    bundleCode(clientCodeMap),
  ]);

  const titleSuffix = `Node.js v${version.version} Documentation`;

  // Step 3: Create final HTML (could be parallelized in workers)
  const results = entries.map(({ data: { api, heading } }) => {
    const fileName = `${api}.js`;

    // Replace template placeholders with actual content
    const renderedHtml = template
      .replace('{{title}}', `${heading.data.name} | ${titleSuffix}`)
      .replace('{{dehydrated}}', serverBundle.pages.get(fileName) ?? '')
      .replace('{{importMap}}', clientBundle.importMap ?? '')
      .replace('{{entrypoint}}', `./${fileName}?${randomUUID()}`)
      .replace('{{speculationRules}}', SPECULATION_RULES);

    // Minify HTML (input must be a Buffer)
    const { code: html } = minifySync(renderedHtml);

    return { html, api };
  });

  const { code: minifiedCSS } = transform({
    code: Buffer.from(`${serverBundle.css}\n${clientBundle.css}`),
    minify: true,
  });

  return { results, chunks: clientBundle.chunks, css: minifiedCSS };
}
