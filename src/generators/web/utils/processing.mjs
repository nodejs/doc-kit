import { randomUUID } from 'node:crypto';

import HTMLMinifier from '@minify-html/node';
import { jsx, toJs } from 'estree-util-to-js';

import { SPECULATION_RULES } from '../constants.mjs';
import bundleCode from './bundle.mjs';
import { createChunkedRequire } from './chunks.mjs';

/**
 * Executes server-side JavaScript code in an isolated context with virtual module support.
 *
 * Takes a map of server-side JavaScript code, bundles it (which may produce code-split chunks),
 * and executes each entry within a new Function constructor. Code-split chunks are made
 * available via an enhanced require function that loads them from an in-memory virtual file system.
 *
 * @param {Map<string, string>} serverCodeMap - Map of fileName to server-side JavaScript code.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - Node.js require function for external packages.
 * @returns {Promise<Map<string, string>>} Map of fileName to dehydrated (server-rendered) HTML content.
 */
export async function executeServerCode(serverCodeMap, requireFn) {
  const dehydratedMap = new Map();

  // Bundle all server-side code, which may produce code-split chunks
  const { chunks } = await bundleCode(serverCodeMap, { server: true });

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

  return dehydratedMap;
}

/**
 * Processes a single JSX AST (Abstract Syntax Tree) entry to generate a complete
 * HTML page, including server-side rendered content, client-side JavaScript, and CSS.
 *
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} entries - The JSX AST entry to process.
 * @param {string} template - The HTML template string that serves as the base for the output page.
 * @param {ReturnType<import('./generate.mjs')>} astBuilders - The AST generators
 * @param {version} version - The version to generator the documentation for
 * @param {ReturnType<import('node:module').createRequire>} requireFn - A Node.js `require` function.
 */
export async function processJSXEntries(
  entries,
  template,
  { buildServerProgram, buildClientProgram },
  requireFn,
  { version }
) {
  const serverCodeMap = new Map();
  const clientCodeMap = new Map();

  // Convert JSX AST to JavaScript for both server and client
  for (const entry of entries) {
    const fileName = `${entry.data.api}.jsx`;

    // Convert AST to JavaScript string with JSX syntax
    const { value: code } = toJs(entry, { handlers: jsx });

    // Prepare code for server-side execution (wrapped for SSR)
    serverCodeMap.set(fileName, buildServerProgram(code));

    // Prepare code for client-side execution (wrapped for hydration)
    clientCodeMap.set(fileName, buildClientProgram(code));
  }

  // Execute all server code at once to get dehydrated HTML
  const serverBundle = await executeServerCode(serverCodeMap, requireFn);

  // Bundle all client code at once (with code splitting for shared chunks)
  const clientBundle = await bundleCode(clientCodeMap);

  const titleSuffix = `Node.js v${version} Documentation`;

  const speculationRulesString = JSON.stringify(SPECULATION_RULES, null, 2);

  // Process each entry to create final HTML
  const results = entries.map(({ data: { api, heading } }) => {
    const fileName = `${api}.js`;

    // Replace template placeholders with actual content
    const renderedHtml = template
      .replace('{{title}}', `${heading.data.name} | ${titleSuffix}`)
      .replace('{{dehydrated}}', serverBundle.get(fileName) ?? '')
      .replace('{{importMap}}', clientBundle.importMap ?? '')
      .replace('{{entrypoint}}', `./${fileName}?${randomUUID()}`)
      .replace('{{speculationRules}}', speculationRulesString);

    // Minify HTML (input must be a Buffer)
    const finalHTMLBuffer = HTMLMinifier.minify(Buffer.from(renderedHtml), {});

    return { html: finalHTMLBuffer, api };
  });

  return { results, ...clientBundle };
}
