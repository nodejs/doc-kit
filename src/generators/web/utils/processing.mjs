import HTMLMinifier from '@minify-html/node';
import { toJs, jsx } from 'estree-util-to-js';

import bundleCode from './bundle.mjs';

/**
 * Executes server-side JavaScript code in a safe, isolated context.
 * This function takes a string of JavaScript code, bundles it, and then runs it
 * within a new Function constructor to prevent scope pollution and allow for
 * dynamic module loading via a provided `require` function.
 * The result of the server-side execution is expected to be assigned to a
 * dynamically generated variable name, which is then returned.
 *
 * @param {string} serverCode - The server-side JavaScript code to execute as a string.
 * @param {ReturnType<import('node:module').createRequire>} requireFn - A Node.js `require` function
 */
export async function executeServerCode(serverCode, requireFn) {
  // Bundle the server-side code. This step resolves imports and prepares the code
  // for execution, ensuring all necessary dependencies are self-contained.
  const { js: bundledServer } = await bundleCode(serverCode, { server: true });

  // Create a new Function from the bundled server code.
  // The `require` argument is passed into the function's scope, allowing the
  // `bundledServer` code to use it for dynamic imports.
  const executedFunction = new Function('require', bundledServer);

  // Execute the dynamically created function with the provided `requireFn`.
  // The result of this execution is the dehydrated content from the server-side rendering.
  return executedFunction(requireFn);
}

/**
 * Processes a single JSX AST (Abstract Syntax Tree) entry to generate a complete
 * HTML page, including server-side rendered content, client-side JavaScript, and CSS.
 *
 * @param {import('../jsx-ast/utils/buildContent.mjs').JSXContent} entry - The JSX AST entry to process.
 * @param {string} template - The HTML template string that serves as the base for the output page.
 * @param {ReturnType<import('./generate.mjs')>} astBuilders - The AST generators
 * @param {version} version - The version to generator the documentation for
 * @param {ReturnType<import('node:module').createRequire>} requireFn - A Node.js `require` function.
 */
export async function processJSXEntry(
  entry,
  template,
  { buildServerProgram, buildClientProgram },
  requireFn,
  { version }
) {
  // `estree-util-to-js` with the `jsx` handler converts the AST nodes into a string
  // that represents the equivalent JavaScript code, including JSX syntax.
  const { value: code } = toJs(entry, { handlers: jsx });

  // `buildServerProgram` takes the JSX-derived code and prepares it for server execution.
  // `executeServerCode` then runs this code in a Node.js environment to produce
  // the initial HTML content (dehydrated state) that will be sent to the client.
  const serverCode = buildServerProgram(code);
  const dehydrated = await executeServerCode(serverCode, requireFn);

  // `buildClientProgram` prepares the JSX-derived code for client-side execution.
  // `bundleCode` then bundles this client-side code, resolving imports and
  // potentially generating associated CSS. This bundle will hydrate the SSR content.
  const clientCode = buildClientProgram(code);
  const clientBundle = await bundleCode(clientCode);

  const title = `${entry.data.heading.data.name} | Node.js v${version} Documentation`;

  // Replace template placeholders with actual content
  const renderedHtml = template
    .replace('{{title}}', title)
    .replace('{{dehydrated}}', dehydrated ?? '')
    .replace('{{clientBundleJs}}', () => clientBundle.js);

  // The input to `minify` must be a Buffer.
  const finalHTMLBuffer = HTMLMinifier.minify(Buffer.from(renderedHtml), {});

  // Return the generated HTML and any CSS produced by the client bundle.
  return {
    html: finalHTMLBuffer,
    css: clientBundle.css,
  };
}
