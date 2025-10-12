// @ts-check
'use strict';

import { assertAstType } from '../../../utils/assertAstType.mjs';
import { GeneratorError } from '../../../utils/generator-error.mjs';
import { METHOD_RETURN_TYPE_EXTRACTOR } from '../constants.mjs';
import { findParentSection } from './findParentSection.mjs';

/**
 * @typedef {import('../../legacy-json/types.d.ts').HierarchizedEntry} HierarchizedEntry
 */

export const createMethodSectionBuilder = () => {
  /**
   * Handles each node in a parameter list
   * @param {import('mdast').ListItem} param0
   * @returns {import('../generated.d.ts').MethodParameter | string[]}
   */
  const parseParameterListNode = ({ children }) => {
    /**
     * `paragraph` will be a parameter's type declaration (ex/ "`asd` {string} Description of asd")
     * or the method's return value (ex/ "Returns: {integer}").
     *
     * `list` is only defined when the parameter is an object that has
     * documented properties.
     */
    const paragraph = assertAstType(children[0], 'paragraph');
    const list = children[1] ? assertAstType(children[1], 'list') : undefined;

    /**
     * @type {import('../generated.d.ts').MethodParameter | import('../generated.d.ts').MethodReturnType}
     */
    const parameter = {};

    const firstChild = paragraph.children[0];
    switch (firstChild.type) {
      case 'inlineCode': {
        // paragraph is something like "`asd` {string} Description of asd"
        parameter['@name'] = firstChild.value;

        // console.log(paragraph.children);

        break;
      }
      case 'text': {
        // paragraph is something like: "Returns: {integer}""

        const returnRegex = METHOD_RETURN_TYPE_EXTRACTOR.exec(firstChild.value);
        if (returnRegex) {
          const [_, _2, type, description] = returnRegex;
          parameter['@type'] = type.split('|').map(type => type.trim());
          parameter.description = description.trim();
          break;
        }

        if (firstChild.value !== 'Returns: ') {
          // Not relevant to us
          break;
        }

        console.log(firstChild.value);

        // if (firstChild.value !== 'Returns: ') {
        //   console.log('asd', firstChild.value, METHOD_RETURN_TYPE_EXTRACTOR.exec(firstChild.value))
        // }

        // console.log(paragraph.children)
        break;
      }
      case 'link': {
        // console.log(firstChild);
        break;
      }
      default: {
        throw new GeneratorError(`unexpected type ${firstChild.type}`);
      }
    }

    return {
      '@name': 'asd',
    };
  };

  /**
   * Parses the parameters that the method accepts
   * @param {HierarchizedEntry} entry The AST entry
   *
   * @returns {{
   *   parameters?: Record<string, import('../generated.d.ts').MethodParameter>,
   *   returns: Array<string>
   * } | undefined}
   */
  const parseParameters = entry => {
    // Ignore header
    const [, ...nodes] = entry.content.children;

    // The first list that exists in a doc entry should be the method's
    // parameter list.
    const listNode = nodes.find(node => node.type === 'list');

    if (!listNode) {
      // Method doesn't take in any parameters
      return undefined;
    }

    /**
     * @type {Record<string, import('../generated.d.ts').MethodParameter>}
     */
    const parameters = {};
    /**
     * @type {Array<string>}
     */
    let returns;

    listNode.children.forEach(listItem => {
      const parameter = parseParameterListNode(listItem);

      if (Array.isArray(parameter)) {
        // Return type
        returns = parameter;
      } else {
        parameter[parameter['@name']] = parameter;
      }
    });

    returns ??= ['any'];

    return {
      parameters,
      returns,
    };
  };

  /**
   * Parses the signatures that the method may have and adds them to the
   * section.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Method} section The method section
   */
  const parseSignatures = (entry, section) => {
    section.signatures = [];

    // Parse all the parameters and store them in a <name>:<parameter section> map
    const parameters = parseParameters(entry);

    // Parse the value of entry.heading.data.text to get the order of parameters and which are optional
  };

  /**
   * Adds the properties expected in a method section to an object.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Method} section The method section
   */
  return (entry, section) => {
    parseSignatures(entry, section);

    const parent = findParentSection(section, ['class', 'module']);

    // Add this section to the parent if it exists
    if (parent) {
      // Put static methods in `staticMethods` property and non-static methods
      // in the `methods` property
      const property = entry.heading.data.text.startsWith('Static method:')
        ? 'staticMethods'
        : 'methods';

      if (!Array.isArray(parent[property])) {
        throw new GeneratorError(
          `expected parent[${property}] to be an array, got type ${typeof parent[property]} instead (parent type=${parent.type})`
        );
      }

      parent[property].push(section);
    }
  };
};
