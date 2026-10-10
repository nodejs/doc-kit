import { getHighlighter } from '@doc-kit/core/plugins/shiki/highlighter.mjs';
import { UNIST } from '@doc-kit/core/utils/queries/index.mjs';
import { parseListItem } from '@doc-kit/core/utils/signature/parseList.mjs';
import parseSignature from '@doc-kit/core/utils/signature/parseSignature.mjs';
import { h as createElement } from 'hastscript';

import { JSX_IMPORTS } from '../../html/constants.mjs';
import { embedHighlightedBlocks } from '../plugins/static-markup.mjs';
import { createJSXElement } from './ast.mjs';
import { getFullName } from './getFullName.mjs';
import { parseListIntoProperties } from './types.mjs';

/**
 * Generates a string representation of a function or class signature.
 *
 * @param {string} functionName - The name of the function or class.
 * @param {import('@doc-kit/core/utils/signature/types').MethodSignature} signature - The parsed signature object.
 * @param {import('@doc-kit/core/generators/metadata/types').HeadingData} [heading] - Metadata of the heading being documented.
 */
export const generateSignature = (
  functionName,
  { params, return: returnType, extends: extendsType },
  heading
) => {
  const isConstructor = heading?.type === 'ctor';
  const prefix = isConstructor ? 'new ' : '';

  // Class with `extends` clause
  if (extendsType) {
    return `class ${prefix}${functionName} extends ${extendsType.type}`;
  }

  // A constructor always yields an instance of its own class, so `void` is
  // never a correct fallback for one. Node's docs omit the `Returns:` line on
  // constructors by convention, so infer it from the class name instead.
  const fallbackReturn = isConstructor ? functionName : 'void';

  // Function or method
  const returnStr = `: ${returnType?.type ?? fallbackReturn}`
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
 * @param {import('@doc-kit/core/utils/signature/types').MethodSignature} signature - Signature object with parameter and return type info.
 * @param {import('@doc-kit/core/generators/metadata/types').HeadingData} [heading] - Metadata of the heading being documented.
 */
export const createSignatureCodeBlock = (functionName, signature, heading) => {
  const sig = generateSignature(functionName, signature, heading);
  const highlighter = getHighlighter('jsx-ast');
  const highlighted = highlighter.highlightToHast(sig, 'typescript');

  return createElement('div', { class: 'signature' }, [
    embedHighlightedBlocks(highlighted),
  ]);
};

/**
 * Transforms a heading + list structure into a function/class signature block.
 * Mutates the `children` array by injecting the signature HAST node.
 *
 * @param {import('@types/mdast').Parent} parent - The parent MDAST node (usually a section).
 * @param {import('@doc-kit/core/generators/metadata/types').HeadingNode} heading - The heading node with metadata.
 * @param {number} idx - The index at which the heading occurs in `parent.children`.
 */
export const insertSignatureCodeBlock = ({ children }, { data }, idx) => {
  // Try to locate the parameter list immediately following the heading
  const listIdx = children.findIndex(UNIST.isStronglyTypedList);

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
    createSignatureCodeBlock(displayName, signature, data)
  );
};

/**
 * Renders a table of properties based on parsed metadata from a Markdown list.
 *
 * @param {import('mdast').List} node
 */
export const createSignatureTable = node => {
  const items = parseListIntoProperties(node);

  return createJSXElement(JSX_IMPORTS.FunctionSignature.name, {
    title: items.length === 1 && 'kind' in items[0] ? null : 'Attributes',
    items,
  });
};
