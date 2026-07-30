import { resolve } from 'node:path';

import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';

import { JSX_IMPORTS, ROOT } from '../constants.mjs';

/**
 * Normalizes a `components` config entry into the `JSXImportConfig` shape.
 * Accepts either the full descriptor or the `Tag: 'source'` string shorthand.
 *
 * @param {[string, import('../constants.mjs').JSXImportConfig | string]} entry
 * @returns {import('../constants.mjs').JSXImportConfig}
 */
const normalizeComponent = ([tag, value]) =>
  typeof value === 'string'
    ? { name: tag, source: value }
    : { name: tag, isDefaultExport: true, ...value };

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
 * Factory function that creates the page programs.
 */
export default () => {
  // User-configured components (for JSX-in-MDX), merged with the built-ins.
  const { components } = getConfig('html');

  const componentImports = [
    ...Object.values(JSX_IMPORTS),
    ...Object.entries(components).map(normalizeComponent),
  ];

  /**
   * Declares only the components a page actually uses.
   *
   * @param {Array<import('../constants.mjs').JSXImportConfig>} imports
   * @param {string} code - The page's JSX expression.
   * @returns {Array<string>}
   */
  const declare = (imports, code) =>
    imports
      .filter(({ name }) => code.includes(`<${name}`))
      .map(({ name, source, isDefaultExport = true }) =>
        createImportDeclaration(name, source, isDefaultExport)
      );

  /**
   * Builds a server-side rendering (SSR) program.
   *
   * @param {string} componentCode - JSX component code expression.
   * @returns {string} Complete server-side JavaScript program.
   */
  const buildServerProgram = componentCode => {
    return [
      // Import the JSX components this page uses
      ...declare(componentImports, componentCode),

      // Import Preact's async SSR render function (named import)
      createImportDeclaration(
        'renderToStringAsync',
        'preact-render-to-string',
        false
      ),

      // Export a renderer that the server bundler can execute.
      `export default () => renderToStringAsync(${componentCode});`,
    ].join('\n');
  };

  // The client entry, shared verbatim by every page
  const clientProgram = [
    createImportDeclaration(null, resolve(ROOT, './ui/index.css')),

    createImportDeclaration(
      'registerIslands',
      resolve(ROOT, './ui/islands/runtime.mjs'),
      false
    ),

    `registerIslands({${componentImports
      .map(
        ({ name, source }) =>
          `${JSON.stringify(name)}: () => import(${JSON.stringify(source)})`
      )
      .join(', ')}});`,
  ].join('\n');

  return { buildServerProgram, clientProgram };
};
