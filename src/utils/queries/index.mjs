'use strict';

import { transformNodesToString } from '../unist.mjs';
import { isTypedList } from './utils.mjs';

// This defines the actual REGEX Queries
export const QUERIES = {
  // Fixes the references to Markdown pages into the API documentation
  markdownUrl: /^(?![+a-zA-Z]+:)([^#?]+)\.md(#.+)?$/,
  // ReGeX to match the {Type}<Type> (API type references)
  normalizeTypes: /(\{|<)(?! )[^<({})>]+(?! )(\}|>)/g,
  // ReGex to match the type API type references that got already parsed
  // so that they can be transformed into HTML links
  linksWithTypes: /\[`<[^<({})>]+>`\]\((\S+)\)/g,
  // ReGeX for handling Stability Indexes Metadata
  stabilityIndex: /^Stability: ([0-5](?:\.[0-3])?)(?:\s*-\s*)?(.*)$/s,
  // ReGeX for handling the Stability Index Prefix
  stabilityIndexPrefix: /Stability: ([0-5](?:\.[0-3])?)/,
  // ReGeX for retrieving the inner content from a YAML block
  yamlInnerContent: /^<!--[ ]?(?:YAML([\s\S]*?)|([ \S]*?))?[ ]?-->/,
  // ReGeX for finding references to Unix manuals
  unixManualPage: /\b([a-z.]+)\((\d)([a-z]?)\)/g,
  // ReGeX for determing a typed list's non-property names
  typedListStarters: /^(Returns|Extends|Type):?\s*/,
};

export const UNIST = {
  /**
   * @param {import('@types/mdast').Blockquote} blockquote
   * @returns {boolean}
   */
  isStabilityNode: ({ type, children }) =>
    type === 'blockquote' &&
    QUERIES.stabilityIndex.test(transformNodesToString(children)),

  /**
   * @param {import('@types/mdast').Html} html
   * @returns {boolean}
   */
  isYamlNode: ({ type, value }) =>
    type === 'html' && QUERIES.yamlInnerContent.test(value),

  /**
   * @param {import('@types/mdast').Text} text
   * @returns {boolean}
   */
  isTextWithType: ({ type, value }) =>
    type === 'text' && QUERIES.normalizeTypes.test(value),

  /**
   * @param {import('@types/mdast').Text} text
   * @returns {boolean}
   */
  isTextWithUnixManual: ({ type, value }) =>
    type === 'text' && QUERIES.unixManualPage.test(value),

  /**
   * @param {import('@types/mdast').Html} html
   * @returns {boolean}
   */
  isHtmlWithType: ({ type, value }) =>
    type === 'html' && QUERIES.linksWithTypes.test(value),

  /**
   * @param {import('@types/mdast').Link} link
   * @returns {boolean}
   */
  isMarkdownUrl: ({ type, url }) =>
    type === 'link' && QUERIES.markdownUrl.test(url),

  /**
   * @param {import('@types/mdast').Heading} heading
   * @returns {boolean}
   */
  isHeading: ({ type, depth }) =>
    type === 'heading' && depth >= 1 && depth <= 5,

  /**
   * @param {import('@types/mdast').LinkReference} linkReference
   * @returns {boolean}
   */
  isLinkReference: ({ type, identifier }) =>
    type === 'linkReference' && !!identifier,

  /**
   * @param {import('@types/mdast').List} list
   * @returns {boolean}
   */
  isLooselyTypedList: list => Boolean(isTypedList(list)),

  /**
   * @param {import('@types/mdast').List} list
   * @returns {boolean}
   */
  isStronglyTypedList: list => {
    const confidence = isTypedList(list);

    if (confidence === 1) {
      // This is a loosely typed list, but we can still check if it is strongly typed.
      const [, secondNode, thirdNode] =
        list.children?.[0]?.children?.[0]?.children ?? [];

      return (
        secondNode?.value?.trim() === '' &&
        thirdNode?.type === 'link' &&
        thirdNode?.children?.[0]?.value?.[0] === '<'
      );
    }

    return Boolean(confidence);
  },
};
