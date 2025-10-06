// @ts-check
'use strict';

import { GeneratorError } from '../../../utils/generator-error.mjs';
import { findParentSection } from './findParentSection.mjs';

/**
 * @typedef {import('../../legacy-json/types.d.ts').HierarchizedEntry} HierarchizedEntry
 *
 * @typedef {{ type: 'parameter' } | { type: 'returnValue' }} ParameterListNode
 */

export const createMethodSectionBuilder = () => {
  /**
   * Handles each node in a parameter list
   * @param {import('mdast').ListItem} param0
   * @returns {import('../generated.d.ts').MethodParameter}
   */
  const parseParameterListNode = ({ children }) => {
    /**
     * `paragraph` will be a parameter's type declaration (ex/ "`asd` {string} Description of asd")
     * or the method's return value (ex/ "Returns: {integer}")
     *
     * `list` only occurs when the parameter is an object that has documented properties
     */
    const [paragraph, list] = children;

    // Safety checks
    if (paragraph.type !== 'paragraph') {
      throw new GeneratorError(
        `expected first node in parameter list node to be a paragraph`
      );
    }

    if (list && list.type !== 'list') {
      throw new GeneratorError(
        `expected second node in parameter list item to be a list`
      );
    }

    const [parameterNameNode] = paragraph.children;

    switch (parameterNameNode.type) {
      case 'inlineCode': {
        // node is something like: "`asd` {string} Description of asd"
        const [
          ,
          blankSpaceNode,
          parameterTypeNode,
          ...parameterDescriptionNodes
        ] = paragraph.children;

        // if (blankSpaceNode.type !== 'text' || blankSpaceNode.value !== ' ') {
        //   console.log('asdasd', blankSpaceNode, blankSpaceNode.type, `"${blankSpaceNode.value}"`);
        //   throw new TypeError(
        //     `expected blank space between parameter name and type`
        //   );
        // }

        if (parameterTypeNode.type !== 'link') {
          // console.log('asd', JSON.stringify(paragraph.children, null, 2));
          throw new TypeError(`expected parameter type to be a link`);
        }

        // console.log(parameterTypeNode);

        break;
      }
      case 'text': {
        // node is something like: "Returns: {integer}""
        break;
      }
    }

    return {
      '@name': 'asd',
    };
  };

  /**
   * Parses the parameters that the method accepts
   * @param {HierarchizedEntry} entry The AST entry
   * @returns {Record<string, import('../generated.d.ts').MethodParameter> | undefined}
   */
  const parseParameters = entry => {
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

    listNode.children.forEach(listItem => {
      const parameter = parseParameterListNode(listItem);

      parameter[parameter['@name']] = parameter;
    });

    return parameters;
  };

  /**
   * Parses the signatures that the method may have and adds them to the
   * section.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Method} section The method section
   */
  const parseSignatures = (entry, section) => {
    section.signatures = [];

    // Parse all the parameters and store them in a name:section map
    const parameters = parseParameters(entry, section);

    // Parse the value of entry.heading.data.text to get the order of parameters and which are optional
    // console.log(entry.heading.data.text);
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
          `expected parent[${property}] to be an array, got type ${typeof parent[property]} instead (parent type=${parent.type})`,
          { entry }
        );
      }

      parent[property].push(section);
    }
  };
};
