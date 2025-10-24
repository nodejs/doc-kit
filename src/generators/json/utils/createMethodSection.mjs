// @ts-check
'use strict';

import {
  assertAstType,
  assertAstTypeOptional,
} from '../../../utils/assertAstType.mjs';
import { GeneratorError } from '../../../utils/generator-error.mjs';
import { METHOD_RETURN_TYPE_EXTRACTOR } from '../constants.mjs';
import { findParentSection } from './findParentSection.mjs';

/**
 * @typedef {import('../../../utils/buildHierarchy.mjs').HierarchizedEntry} HierarchizedEntry
 */

export const createMethodSectionBuilder = () => {
  /**
   * Handles each node in a parameter list
   * @param {import('mdast').ListItem} param0
   * @returns {import('../generated.d.ts').MethodParameter | (import('../generated.d.ts').MethodReturnType & { returnType: true })}
   */
  const parseParameterListNode = ({ children }) => {
    /**
     * A parameter's type declaration (ex/ "`asd` {string} Description of asd")
     * or the method's return value (ex/ "Returns: {integer}").
     */
    const paragraph = assertAstType(children[0], 'paragraph');

    /**
     * Only should be defined when the parameter is an object that has
     * documented properties.
     */
    const list = assertAstTypeOptional(children[1], 'list');

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
          parameter.description = description?.trim();
          break;
        }

        if (firstChild.value !== 'Returns: ') {
          // Not relevant to us
          break;
        }

        if (paragraph.children.length < 2) {
          throw new GeneratorError(
            `expected at least 2 children in a method's return type`
          );
        }

        switch (paragraph.children[1].type) {
          case 'inlineCode': {
            // Returns: undefined
            parameter['@type'] = paragraph.children[1].value;
            // TODO grab description if existed
            break;
          }
          case 'link': {
            break;
          }
          default: {
            throw new GeneratorError(
              `unexpected child type ${paragraph.children[1].type}`
            );
          }
        }

        if (paragraph.children[1].type !== 'link') {
          // console.log(paragraph.children[1]);
        }

        // console.log(paragraph.children);

        // if (firstChild.value !== 'Returns: ') {
        //   console.log('asd', firstChild.value, METHOD_RETURN_TYPE_EXTRACTOR.exec(firstChild.value))
        // }

        // console.log(paragraph.children)
        break;
      }
      default: {
        throw new GeneratorError(`unexpected type ${firstChild.type}`);
      }
    }

    return parameter;
  };

  /**
   * Parses the parameters that the method accepts
   * @param {HierarchizedEntry} entry The AST entry
   *
   * @returns {{
   *   parameters?: Record<string, import('../generated.d.ts').MethodParameter>,
   *   returns: import('../generated.d.ts').MethodReturnType
   * } | undefined}
   */
  const parseParameters = entry => {
    // Ignore header
    const [, ...nodes] = entry.content.children;

    // The first child node should be the method's parameter list. If there
    // isn't one, there is no parameter list.
    const listNode = nodes[0];
    if (!listNode || listNode.type !== 'list') {
      // Method doesn't take in any parameters
      return undefined;
    }

    /**
     * @type {Record<string, import('../generated.d.ts').MethodParameter>}
     */
    const parameters = {};
    /**
     * @type {import('../generated.d.ts').MethodReturnType}
     */
    let returns = { '@type': 'any' };

    listNode.children.forEach(listItem => {
      const parameter = parseParameterListNode(listItem);
      // console.log(parameter);
      if (parameter.returnType) {
        // Return type
        returns = { ...parameter, returnType: undefined };
      } else {
        parameter[parameter['@name']] = parameter;
      }
    });

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
    const parsedParameters = parseParameters(entry);
    if (!parsedParameters) {
      return;
    }

    const { parameters, returns } = parsedParameters;

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
