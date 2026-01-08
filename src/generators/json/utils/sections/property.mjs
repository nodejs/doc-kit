'use strict';

import { transformNodeToString } from '../../../../utils/unist.mjs';
import {
  DEFAULT_EXPRESSION,
  DOC_TYPE_TO_CORRECT_JS_TYPE_MAP,
} from '../../constants.mjs';
import { findParentSection } from '../findParentSection.mjs';
import { parseTypeList } from '../parseTypeList.mjs';

/**
 * Parse the type of the property from the AST
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Property} section The method section
 * @returns {import('mdast').Paragraph | undefined} The list element that contains the property's type information
 */
export function parseType(entry, section) {
  const [, ...nodes] = entry.content.children;

  // The first list that exists in the entry should be its type info
  const listNode = nodes.find(node => node.type === 'list');

  if (!listNode) {
    // No type information, default to `any`
    section['@type'] = 'any';

    return undefined;
  }

  // Should look something like these in the Markdown source:
  // {integer} **Default:** 8192
  // {integer} bla bla bla
  // {number|boolean}
  // Type: {Function} bla bla bla
  const firstListElement = structuredClone(listNode.children[0].children[0]);

  if (firstListElement.type !== 'paragraph') {
    throw new TypeError(
      `expected first node in property type list node to be a paragraph, got ${firstListElement.type}`
    );
  }

  switch (firstListElement.children[0].type) {
    case 'text': {
      // Something like `Type: {integer} bla bla bla`
      if (firstListElement.children[0].value !== 'Type: ') {
        break;
      }

      // Consume the `Type: ` and fallthrough to parsing it like the other
      // format
      firstListElement.children.shift();
    }
    // eslint-disable-next-line no-fallthrough
    case 'link': {
      // Something like `{integer} bla bla bla`

      const { types, endingIndex } = parseTypeList(firstListElement.children);

      if (types.length) {
        section['@type'] = types.map(type => {
          let isArray = type.endsWith('[]');
          if (isArray) {
            type = type.substring(0, type.length - 2);
          }

          type = DOC_TYPE_TO_CORRECT_JS_TYPE_MAP[type.toLowerCase()] ?? type;

          if (isArray) {
            type += '[]';
          }

          return type;
        });

        if (section['@type'].length === 1) {
          section['@type'] = section['@type'][0];
        }
      } else {
        section['@type'] = 'any';
      }

      firstListElement.children.splice(0, endingIndex + 2);

      break;
    }
    default: {
      // Not something that we can get a type from
      break;
    }
  }

  return firstListElement;
}

/**
 * A property may have its description with its type declaration instead of
 * where it is normally defined. If that's the case, let's append it to the
 * section's description.
 * @param {import('mdast').Paragraph} listElement The AST entry
 * @param {import('../../generated/generated.d.ts').Property} section The method section
 */
export function parseDescription(listElement, section) {
  if (listElement.children.length === 0) {
    return;
  }

  let description = '';

  for (let i = 0; i < listElement.children.length; i++) {
    const node = listElement.children[i];

    // Check if this is defining the property's default value. If so, we can
    // mark it as mutable.
    if (node.type === 'strong') {
      const [child] = node.children;

      // TODO: it'd be great to actually extract the default value here and
      // add it as a property in the section, there isn't really a standard
      // way to specify the default values so that'd be pretty messy right
      // now
      if (child?.type === 'text' && DEFAULT_EXPRESSION.test(child?.value)) {
        section.mutable = true;
      }
    }

    description += transformNodeToString(node).trim() + ' ';
  }

  if (description.length) {
    section.description = description.trim();
  }
}

/**
 * Adds the properties expected in a method section to an object.
 * @param {import('../../../../utils/buildHierarchy.mjs').HierarchizedEntry} entry The AST entry
 * @param {import('../../generated/generated.d.ts').Property} section The method section
 */
export function createPropertySection(entry, section) {
  const listElement = parseType(entry, section);

  if (listElement) {
    parseDescription(listElement, section);
  }

  const parent = findParentSection(section, ['class', 'module']);

  // Add this section to the parent if it exists
  if (parent) {
    parent.properties ??= [];
    parent.properties.push(section);
  }
}
