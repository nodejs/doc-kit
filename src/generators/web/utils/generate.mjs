import { resolve } from 'node:path';

import { JSX_IMPORTS, ROOT } from '../constants.mjs';

/**
 * Creates an ES Module `import` statement as a string, based on parameters.
 *
 * @param {string|null} importName - The identifier to import.
 * @param {string} source - The module path.
 * @param {boolean} [useDefault=true] - Whether to use default import (true) or named import (false).
 * @returns {string} The generated import statement.
 */
export const createImportDeclaration = (
  importName,
  source,
  useDefault = true
) => {
  // Escape backslashes to prevent treating them as escape characters
  source = source.replaceAll('\\', '\\\\');

  // Side-effect-only import (e.g., CSS files)
  if (!importName) {
    return `import "${source}";`;
  }

  // Default import: import Name from "source"
  if (useDefault) {
    return `import ${importName} from "${source}";`;
  }

  // Named import: import { Name } from "source"
  return `import { ${importName} } from "${source}";`;
};

/**
 * Factory function that creates server and client program generators.
 *
 * Returns two functions that wrap JSX component code:
 * - `buildClientProgram`: Wraps component for client-side hydration
 * - `buildServerProgram`: Wraps component for server-side rendering
 */
export default () => {
  // Generate import statements for all JSX components
  // TODO: Optimize by conditionally including server-only or client-only imports
  const baseImports = Object.values(JSX_IMPORTS).map(
    ({ name, source, isDefaultExport = true }) =>
      createImportDeclaration(name, source, isDefaultExport)
  );

  /**
   * Builds a client-side hydration program.
   *
   * @param {string} componentCode - JSX component code expression.
   * @returns {string} Complete client-side JavaScript program.
   */
  const buildClientProgram = componentCode => {
    return [
      // Import all JSX components
      ...baseImports,

      // Import CSS styles for client-side rendering
      createImportDeclaration(null, resolve(ROOT, './ui/index.css')),

      // Import Preact's hydrate function (named import)
      createImportDeclaration('hydrate', 'preact', false),

      // Hydrate the component into the root element
      `hydrate(${componentCode}, document.getElementById("root"));`,
    ].join('');
  };

  /**
   * Builds a server-side rendering (SSR) program.
   *
   * @param {string} componentCode - JSX component code expression.
   * @returns {string} Complete server-side JavaScript program.
   */
  const buildServerProgram = componentCode => {
    return [
      // Import all JSX components
      ...baseImports,

      // Import Preact's SSR render function (named import)
      createImportDeclaration(
        'renderToString',
        'preact-render-to-string',
        false
      ),

      // Render component to HTML string and return it
      `return renderToString(${componentCode});`,
    ].join('\n');
  };

  return { buildClientProgram, buildServerProgram };
};
