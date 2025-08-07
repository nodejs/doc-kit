import { resolve } from 'node:path';

import { JSX_IMPORTS, ROOT } from '../constants.mjs';

/**
 * Creates an ES Module `import` statement as a string, based on parameters.
 *
 * @param {string|null} importName - The identifier to import
 * @param {string} source - The module path
 * @param {boolean} [useDefault=true] - Determines if the import is a default or named import.
 */
export const createImportDeclaration = (
  importName,
  source,
  useDefault = true
) => {
  // '\' characters shouldn't escape the next character,
  // but rather be treated as slashes.
  source = source.replaceAll('\\', '\\\\');

  // Side-effect-only import (CSS)
  if (!importName) {
    return `import "${source}";`;
  }

  // Import default export
  if (useDefault) {
    return `import ${importName} from "${source}";`;
  }

  // Import named export
  return `import { ${importName} } from "${source}";`;
};

/**
 * Factory function that returns two program generators:
 * - One for hydrating client-side React/Preact apps
 * - One for server-side rendering (SSR) to HTML
 */
export default () => {
  // Construct a list of `import` statements from JSX_IMPORTS
  //
  // TODO(@avivkeller): A known optimization opportunity exists:
  // Some of these imports are only needed on the server (or only client).
  // It would be more efficient to generate them conditionally.
  const baseImports = Object.values(JSX_IMPORTS).map(
    ({ name, source, isDefaultExport = true }) =>
      createImportDeclaration(name, source, isDefaultExport)
  );

  /**
   * Builds a client-side hydration program.
   * @param {string} componentCode - Code expression representing a JSX component
   */
  const buildClientProgram = componentCode => {
    return [
      // JSX component imports
      ...baseImports,

      // Import client-side CSS styles.
      // This ensures that styles used in the rendered app are loaded on the client.
      // The use of `new URL(...).pathname` resolves the absolute path for `entrypoint.jsx`.
      createImportDeclaration(null, resolve(ROOT, './ui/index.css')),

      // Import `hydrate()` from Preact — needed to attach to server-rendered HTML.
      // This is a named import (not default), hence `false` as the third argument.
      createImportDeclaration('hydrate', 'preact', false),

      // Hydration call: binds the component to an element with ID "root"
      // This assumes SSR has placed matching HTML there, which, it has.
      `hydrate(${componentCode}, document.getElementById("root"));`,
    ].join('');
  };

  /**
   * Builds a server-side rendering (SSR) program.
   *
   * @param {string} componentCode - Code expression representing a JSX component
   */
  const buildServerProgram = componentCode => {
    return [
      // JSX component imports
      ...baseImports,

      // Import Preact's SSR module
      createImportDeclaration('render', 'preact-render-to-string', false),

      // Render the component to an HTML string
      // The output can be embedded directly into the server's HTML template
      `return render(${componentCode});`,
    ].join('\n');
  };

  return {
    buildClientProgram,
    buildServerProgram,
  };
};
