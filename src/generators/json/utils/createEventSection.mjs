// @ts-check
import { GeneratorError } from '../../../utils/generator-error.mjs';
import { EVENT_TYPE_DESCRIPTION_EXTRACTOR } from '../constants.mjs';
import { findParentSection } from './findParentSection.mjs';
import { stringifyNode } from './stringifyNode.mjs';

/**
 * @typedef {import('../../legacy-json/types.d.ts').HierarchizedEntry} HierarchizedEntry
 */

export const createEventSectionBuilder = () => {
  /**
   * Parse the parameters for the event's callback method
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Event} section The event section
   */
  const parseParameters = (entry, section) => {
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

          // todo why does delimiter.value === ' ' = false even when that's the case ????????
          if (rest[0]?.type === 'link') {
            // Type _should_ be a link with maybe a description following
            const [type, ...descriptionNodes] = rest;

            // TODO type can be | thing here as well :)
            parameter['@type'] = type.children[0].value;

            let description = '';
            descriptionNodes.forEach(
              node => (description += stringifyNode(node))
            );

            if (description !== '') {
              parameter.description = description;
            }
          } else {
            // Type isn't a link and we get the joy of extracting it
            const value = EVENT_TYPE_DESCRIPTION_EXTRACTOR.exec(
              delimiter.value
            );
            if (value === null) {
              throw new GeneratorError(
                `failed extracting type & description from '${delimiter.value}'`
              );
            }

            parameter['@type'] = value[1].trim();
            parameter.description = value[2].trim();
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
          let type = '';

          let i = 0;
          let moreTypes = false;
          do {
            const node = parameterAst.children[i];
            if (node.type !== 'link') {
              throw new GeneratorError(
                `expected type 'link', got ${node.type}`
              );
            }

            if (node.children[0].type !== 'inlineCode') {
              throw new GeneratorError(
                `expected type 'inlineCode', got ${node.children[0].type}`
              );
            }

            type += node.children[0].value;

            // Check if this link is followed up by a `|`
            const nextNode = parameterAst.children[i + 1];
            moreTypes =
              nextNode &&
              nextNode.type === 'text' &&
              nextNode.value.trim() === '|';
            if (moreTypes) {
              type += ' | ';
            }
            i += 2;
          } while (moreTypes);

          parameter['@name'] = 'value';
          parameter['@type'] = type;

          let description = '';
          for (; i < parameterAst.children.length; i++) {
            description += stringifyNode(parameterAst.children[i]);
          }

          if (description !== '') {
            parameter.description = description;
          }

          break;
        }
        default: {
          throw new TypeError(
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
  };

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
      parent.events.push(section);
    }
  };
};
