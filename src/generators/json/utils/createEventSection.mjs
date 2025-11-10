'use strict';

import { GeneratorError } from '../../../utils/generator-error.mjs';
import { EVENT_TYPE_DESCRIPTION_EXTRACTOR } from '../constants.mjs';
import { findParentSection } from './findParentSection.mjs';
import { parseTypeList } from './parseTypeList.mjs';
import { stringifyNode } from './stringifyNode.mjs';

/**
 * @typedef {import('../../../utils/buildHierarchy.mjs').HierarchizedEntry} HierarchizedEntry
 */

/**
 * Parse the parameters for the event's callback method
 * @param {HierarchizedEntry} entry The AST entry
 * @param {import('../generated.d.ts').Event} section The event section
 */
export function parseParameters(entry, section) {
  const [, ...nodes] = entry.content.children;
  const listNode = nodes[0];

  // If an event has type info it should be the first thing in its child
  // elements
  if (!listNode || listNode.type !== 'list') {
    // No parameters
    return;
  }

  section.parameters ??= [];

  for (const node of listNode.children) {
    let parameterAst = node.children[0];
    if (parameterAst.type !== 'paragraph') {
      throw new TypeError(
        `expected ast type 'paragraph', got ${parameterAst.type}`
      );
    }

    /**
     * @type {import('../generated.d.ts').MethodParameter}
     */
    const parameter = {};

    // This list node can be in three different formats:
    // 1. `paramName` <type> [description]
    // 2. Type: <type> [description]
    // 3. <type> [description]
    switch (parameterAst.children[0]?.type) {
      case 'inlineCode': {
        // First format
        if (parameterAst.children.length < 2) {
          throw new GeneratorError(
            `expected min 2 children, got ${parameterAst.children.length}`
          );
        }

        const [name, delimiter, ...rest] = parameterAst.children;
        parameter['@name'] = name.value;

        if (delimiter.type !== 'text') {
          throw new GeneratorError(
            `expected delimiter child type in list node to be 'text', got ${delimiter.type} (@name=${parameter['@name']})`
          );
        }

        if (rest[0]?.type === 'link') {
          // Type _should_ be a link with maybe a description following
          const { types, endingIndex } = parseTypeList(
            parameterAst.children,
            2
          );
          if (types.length === 0) {
            parameter['@type'] = 'any';
          } else {
            parameter['@type'] = types.length === 1 ? types[0] : types;
          }

          let description = '';
          for (let i = endingIndex + 1; i < parameterAst.children.length; i++) {
            description += stringifyNode(parameterAst.children[i]);
          }

          if (description.length > 0) {
            parameter.description = description.trim();
          }
        } else {
          // Type isn't a link and we get the joy of extracting it
          const value = EVENT_TYPE_DESCRIPTION_EXTRACTOR.exec(delimiter.value);
          if (value === null) {
            throw new GeneratorError(
              `failed extracting type & description from '${delimiter.value}'`
            );
          }

          parameter['@type'] = value[1].trim();

          const description = value[2].trim();
          if (description.length > 0) {
            parameter.description = description;
          }
        }

        break;
      }
      case 'text': {
        // Second format, pop the `Type: ` literal and then fallthrough to
        // parsing it like the third format

        if (parameterAst.children[0].value !== 'Type: ') {
          // Not what we want
          continue;
        }

        parameterAst = {
          ...parameterAst,
          children: structuredClone(parameterAst.children),
        };
        parameterAst.children.shift();

        // Fallthrough on purpose
      }
      case 'link': {
        // Third format

        parameter['@name'] = 'value';

        const { types, endingIndex } = parseTypeList(parameterAst.children);
        if (types.length === 0) {
          parameter['@type'] = 'any';
        } else {
          parameter['@type'] = types.length === 1 ? types[0] : types;
        }

        let description = '';
        for (let i = endingIndex + 1; i < parameterAst.children.length; i++) {
          description += stringifyNode(parameterAst.children[i]);
        }

        if (description !== '') {
          parameter.description = description.trim();
        }

        break;
      }
      default: {
        throw new GeneratorError(
          `unexpected list node type: ${parameterAst.children[0].type}`
        );
      }
    }

    parameter['@name'] = parameter['@name']
      .replaceAll("'", '')
      .replaceAll('<', '')
      .replaceAll('>', '');

    if (parameter.description) {
      parameter.description = parameter.description.trim();
    }

    section.parameters.push(parameter);
  }
}

/**
 *
 */
export const createEventSectionBuilder = () => {
  /**
   * Adds the properties expected in an event section to an object.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Event} section The event section
   */
  return (entry, section) => {
    parseParameters(entry, section);

    const parent = findParentSection(section, ['class', 'module']);

    // Add this section to the parent if it exists
    if (parent) {
      parent.events ??= [];
      parent.events.push(section);
    }
  };
};
