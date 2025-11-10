import HTMLMinifier from '@minify-html/node';
import { toJs, jsx } from 'estree-util-to-js';

import bundleCode from './bundle.mjs';

/**
 * Executes server-side JavaScript code in a safe, isolated context.
 * This function takes a Map of JavaScript code strings, bundles them together, and then runs each
 * within a new Function constructor to prevent scope pollution and allow for
 * dynamic module loading via a provided `require` function.
 * The result of the server-side execution is expected to be assigned to a
 * dynamically generated variable name, which is then returned.
 *
 * @param {Map<string, string>} serverCodeMap - Map of fileName to server-side JavaScript code.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - A Node.js `require` function
 * @returns {Promise<Map<string, string>>} Map of fileName to dehydrated HTML content
 */
export async function executeServerCode(serverCodeMap, requireFn) {
  // Execute each bundled server code and collect results
  const dehydratedMap = new Map();

  for (const [fileName, serverCode] of serverCodeMap.entries()) {
    // Bundle all server-side code together. This step resolves imports and prepares the code
    // for execution, ensuring all necessary dependencies are self-contained.
    const { jsMap } = await bundleCode(serverCode, { server: true });

    // Create a new Function from the bundled server code.
    // The `require` argument is passed into the function's scope, allowing the
    // `bundledServer` code to use it for dynamic imports.
    const executedFunction = new Function('require', jsMap['entrypoint.jsx']);

    // Execute the dynamically created function with the provided `requireFn`.
    // The result of this execution is the dehydrated content from the server-side rendering.
    dehydratedMap.set(fileName, executedFunction(requireFn));
  }

  return dehydratedMap;
}

/**
 * Processes multiple JSX AST (Abstract Syntax Tree) entries to generate complete
 * HTML pages, including server-side rendered content, client-side JavaScript, and CSS.
 *
 * @param {import('../jsx-ast/utils/buildContent.mjs').JSXContent[]} entries - The JSX AST entries to process.
 * @param {string} template - The HTML template string that serves as the base for the output page.
 * @param {ReturnType<import('./generate.mjs')>} astBuilders - The AST generators
 * @param {Object} options - Processing options
 * @param {string} options.version - The version to generate the documentation for
 * @param {ReturnType<import('node:module').createRequire>} requireFn - A Node.js `require` function.
 */
export async function processJSXEntries(
  entries,
  template,
  { buildServerProgram, buildClientProgram },
  requireFn,
  { version }
) {
  // Convert all entries to JavaScript code
  const serverCodeMap = new Map();
  const clientCodeMap = new Map();

  for (const entry of entries) {
    const fileName = `${entry.data.api}.jsx`;

    // `estree-util-to-js` with the `jsx` handler converts the AST nodes into a string
    // that represents the equivalent JavaScript code, including JSX syntax.
    const { value: code } = toJs(entry, { handlers: jsx });

    // `buildServerProgram` takes the JSX-derived code and prepares it for server execution.
    serverCodeMap.set(fileName, buildServerProgram(code));

    // `buildClientProgram` prepares the JSX-derived code for client-side execution.
    clientCodeMap.set(fileName, buildClientProgram(code));
  }

  // Execute all server code at once
  const dehydratedMap = await executeServerCode(serverCodeMap, requireFn);

  // Bundle all client code at once
  const clientBundle = await bundleCode(clientCodeMap);

  // Rolldown's experimental.chunkImportMap generates the import map automatically
  // The import map is extracted by our plugin and returned as HTML
  // https://rolldown.rs/options/experimental#chunkimportmap
  const importMapScript = clientBundle.importMapHtml;

  // Prepare jsChunks for file writing
  const chunksWithHashes = clientBundle.jsChunks.map(chunk => ({
    fileName: chunk.fileName,
    code: chunk.code,
    hash: '', // No need for manual hashing, Rolldown handles cache busting via importMap
  }));

  // Process each entry to create HTML
  const results = entries.map(entry => {
    const fileName = `${entry.data.api}.jsx`;
    const dehydrated = dehydratedMap.get(fileName);
    const mainJsCode = clientBundle.jsMap[fileName];

    const title = `${entry.data.heading.data.name} | Node.js v${version} Documentation`;

    // Replace template placeholders with actual content
    const renderedHtml = template
      .replace('{{title}}', title)
      .replace('{{dehydrated}}', dehydrated ?? '')
      .replace('{{importMap}}', importMapScript)
      .replace('{{mainJsCode}}', () => mainJsCode);

    // The input to `minify` must be a Buffer.
    const finalHTMLBuffer = HTMLMinifier.minify(Buffer.from(renderedHtml), {});

    return { html: finalHTMLBuffer, api: entry.data.api };
  });

  // Return the generated HTML, CSS, and any JS chunks from code splitting
  // Note: main JS is inlined in HTML, so we don't return it separately
  return {
    results,
    css: clientBundle.css,
    jsChunks: chunksWithHashes,
  };
}
