// @ts-check
'use strict';

import { DEFAULT_EXPRESSION } from '../constants.mjs';
import { findParentSection } from './findParentSection.mjs';
import { stringifyNode } from './stringifyNode.mjs';

/**
 * @typedef {import('../../legacy-json/types.d.ts').HierarchizedEntry} HierarchizedEntry
 */

/**
 * Some types in the docs have different capitalization than what exists in JS
 * @type {Record<string, string>}
 */
const docTypeToCorrectJsType = {
  integer: 'number',
  bigint: 'BigInt',
  symbol: 'Symbol',
};

export const createPropertySectionBuilder = () => {
  /**
   * Parse the type of the property from the AST
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Property} section The method section
   * @returns {import('mdast').Paragraph | undefined} The list element that contains the property's type information
   */
  const parseType = (entry, section) => {
    const [, ...nodes] = entry.content.children;

    // The first list that exists in the entry should be its type info
    const listNode = nodes.find(node => node.type === 'list');

    if (!listNode) {
      // No type information, default to `any`
      section['@type'] = 'any';

      return undefined;
    }

    const firstListElement = structuredClone(listNode.children[0].children[0]);

    if (firstListElement.type !== 'paragraph') {
      throw new TypeError(
        `expected first node in property type list node to be a paragraph, got ${firstListElement.type}`
      );
    }

    // Should look something like these in the Markdown source:
    // {integer} **Default:** 8192
    // {integer} bla bla bla
    // {boolean}
    // Type: {Function} bla bla bla
    let typeNode = firstListElement.children[0];

    /**
     * @param {import('mdast').Link} node
     */
    const parseTypeFromLink = node => {
      const { type, value } = node.children[0];

      if (type !== 'inlineCode') {
        throw new TypeError(
          `unexpected link node child type ${type} for property ${section['@name']}`
        );
      }

      let formattedValue = value;
      if (formattedValue.startsWith('<')) {
        formattedValue = formattedValue.substring(1, formattedValue.length - 1);
      }

      let isArray = false;
      if (formattedValue.endsWith('[]')) {
        isArray = true;

        // Trim off the [] so we can get the base type
        formattedValue = formattedValue.substring(0, formattedValue.length - 2);
      }

      formattedValue =
        docTypeToCorrectJsType[formattedValue.toLowerCase()] ?? formattedValue;

      if (isArray) {
        // Add the [] back
        formattedValue += '[]';
      }

      section['@type'] = formattedValue;
    };

    switch (typeNode.type) {
      case 'link': {
        // Consume the type
        firstListElement.children.shift();
        parseTypeFromLink(typeNode);

        break;
      }
      case 'text': {
        if (typeNode.value !== 'Type: ') {
          break;
        }

        // Consume the `Type: ` text & the type
        firstListElement.children.shift();
        typeNode = firstListElement.children.shift();

        if (typeNode?.type === 'link') {
          parseTypeFromLink(typeNode);
        }

        break;
      }
      default: {
        // Not something that we can get a type from
        break;
      }
    }

    return firstListElement;
  };

  /**
   * Properties can have a link in their docs that provides more information.
   * Let's try to find that link and add it as the `@see` property.
   * @param {import('mdast').Paragraph} listElement The AST entry
   * @param {import('../generated.d.ts').Property} section The method section
   */
  const parseReferenceLink = (listElement, section) => {
    const possibleLink = listElement.children[0];

    if (!possibleLink || possibleLink.type !== 'link') {
      return;
    }

    // Consume the link
    listElement.children.shift();
    section['@see'] = possibleLink.url;
  };

  /**
   * A property may have its description with its type declaration instead of
   * where it is normally defined. If that's the case, let's append it to the
   * section's description.
   * @param {import('mdast').Paragraph} listElement The AST entry
   * @param {import('../generated.d.ts').Property} section The method section
   */
  const parseDescription = (listElement, section) => {
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
        if (child.type === 'text' && DEFAULT_EXPRESSION.test(child.value)) {
          section.mutable = true;
        }
      }

      description += stringifyNode(node);
    }

    section.description ??= '';
    section.description += description;
  };

  /**
   * Adds the properties expected in a method section to an object.
   * @param {HierarchizedEntry} entry The AST entry
   * @param {import('../generated.d.ts').Property} section The method section
   */
  return (entry, section) => {
    const listElement = parseType(entry, section);

    if (listElement) {
      parseReferenceLink(listElement, section);

      parseDescription(listElement, section);
    }

    const parent = findParentSection(section, ['class', 'module']);

    // Add this section to the parent if it exists
    if (parent) {
      parent.properties.push(section);
    }
  };
};
