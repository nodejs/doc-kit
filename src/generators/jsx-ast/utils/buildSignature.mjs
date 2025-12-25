import { h as createElement } from 'hastscript';

import { highlighter } from '../../../utils/highlighter.mjs';
import createQueries from '../../../utils/queries/index.mjs';
import { parseListItem } from '../../legacy-json/utils/parseList.mjs';
import parseSignature from '../../legacy-json/utils/parseSignature.mjs';

/**
 * Generates a string representation of a function or class signature.
 *
 * @param {string} functionName - The name of the function or class.
 * @param {import('../../legacy-json/types').MethodSignature} signature - The parsed signature object.
 * @param {string} prefix - Optional prefix, i.e. `'new '` for constructors.
 */
export const generateSignature = (
  functionName,
  { params, return: returnType, extends: extendsType },
  prefix = ''
) => {
  // Class with `extends` clause
  if (extendsType) {
    return `class ${prefix}${functionName} extends ${extendsType.type}`;
  }

  // Function or method
  const returnStr = (returnType ? `: ${returnType.type}` : '')
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .join(' | ');

  const paramsStr = params
    .map(param => {
      let paramStr = param.name;

      // Mark as optional if either optional or has a default value
      if (param.optional || param.default) {
        paramStr += '?';
      }

      return paramStr;
    })
    .join(', ');

  return `${prefix}${functionName}(${paramsStr})${returnStr}`;
};

/**
 * Creates a syntax-highlighted code block for a signature using rehype-shiki.
 *
 * @param {string} functionName - The function name to display.
 * @param {import('../../legacy-json/types').MethodSignature} signature - Signature object with parameter and return type info.
 * @param {string} prefix - Optional prefix like `'new '`.
 */
export const createSignatureCodeBlock = (functionName, signature, prefix) => {
  const sig = generateSignature(functionName, signature, prefix);
  const highlighted = highlighter.highlightToHast(sig, 'typescript');

  return createElement('div', { class: 'signature' }, [highlighted]);
};

/**
 * Infers the "real" function name from a heading node.
 * Useful when auto-generated headings differ from code tokens.
 *
 * @param {HeadingMetadataEntry} heading - Metadata with name and text fields.
 * @param {any} fallback - Fallback value if inference fails.
 */
export const getFullName = ({ name, text }, fallback = name) => {
  // If the name and text are identical, just use fallback
  if (name === text) {
    return fallback;
  }

  // Attempt to extract inline code from heading text
  const code = text.trim().match(/`([^`]+)`/)?.[1];

  // If inline code includes the name, return a clean version of it
  return code?.includes(name)
    ? code
        .slice(0, code.indexOf(name) + name.length) // Truncate everything after the name.
        .replace(/^["']|new\s*/, '') // Strip quotes or "new" keyword
    : fallback;
};

/**
 * Transforms a heading + list structure into a function/class signature block.
 * Mutates the `children` array by injecting the signature HAST node.
 *
 * @param {import('@types/mdast').Parent} parent - The parent MDAST node (usually a section).
 * @param {import('@types/mdast').Heading} heading - The heading node with metadata.
 * @param {number} idx - The index at which the heading occurs in `parent.children`.
 */
export default ({ children }, { data }, idx) => {
  // Try to locate the parameter list immediately following the heading
  const listIdx = children.findIndex(createQueries.UNIST.isStronglyTypedList);

  // Parse parameters from the list, if found
  const params =
    listIdx >= 0 ? children[listIdx].children.map(parseListItem) : [];

  // Create a parsed signature object from the heading text and list
  const signature = parseSignature(data.text, params);

  if (data.type === 'class' && !signature.extends) {
    // We don't need to add a signature block, since
    // this class has nothing to extend.
    return;
  }

  // Determine the displayed name (e.g., handles cases like `new Foo`)
  const displayName = getFullName(data);

  // If this is a class declaration, we discard the `Extends` list below it
  if (data.type === 'class') {
    children.splice(listIdx, 1); // Remove class param list
  }

  // Insert the highlighted signature block above the heading
  children.splice(
    idx,
    0,
    createSignatureCodeBlock(
      displayName,
      signature,
      data.type === 'ctor' ? 'new ' : ''
    )
  );
};
