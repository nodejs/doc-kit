'use strict';

import { u as createTree } from 'unist-builder';
import { SKIP } from 'unist-util-visit';

import {
  DOC_API_STABILITY_SECTION_REF_URL,
  VALID_JAVASCRIPT_PROPERTY,
} from './constants.mjs';
import {
  extractYamlContent,
  parseHeadingIntoMetadata,
  parseYAMLIntoMetadata,
  transformTypeToReferenceLink,
  transformUnixManualToLink,
} from '../parser/index.mjs';
import { getRemark } from '../remark.mjs';
import { transformNodesToString } from '../unist.mjs';

/**
 * Creates an instance of the Query Manager, which allows to do multiple sort
 * of metadata and content metadata manipulation within an API Doc
 * @param {Record<string, string>} typeMap The mapping to types to links
 */
const createQueries = typeMap => {
  const remark = getRemark();
  /**
   * Sanitizes the YAML source by returning the inner YAML content
   * and then parsing it into an API Metadata object and updating the current Metadata
   *
   * @param {import('@types/mdast').Html} node A HTML node containing the YAML content
   * @param {ReturnType<import('../../metadata.mjs').default>} apiEntryMetadata The API entry Metadata
   */
  const addYAMLMetadata = (node, apiEntryMetadata) => {
    const yamlContent = extractYamlContent(node);

    apiEntryMetadata.updateProperties(parseYAMLIntoMetadata(yamlContent));

    return [SKIP];
  };

  /**
   * Parse a Heading node into metadata and updates the current metadata
   *
   * @param {import('@types/mdast').Heading} node A Markdown heading node
   * @param {ReturnType<import('../../metadata.mjs').default>} apiEntryMetadata The API entry Metadata
   */
  const setHeadingMetadata = (node, apiEntryMetadata) => {
    const stringifiedHeading = transformNodesToString(node.children);

    // Append the heading metadata to the node's `data` property
    node.data = parseHeadingIntoMetadata(stringifiedHeading, node.depth);

    apiEntryMetadata.setHeading(node);
  };

  /**
   * Updates a Markdown link into a HTML link for API docs
   *
   * @param {import('@types/mdast').Link} node A Markdown link node
   */
  const updateMarkdownLink = node => {
    node.url = node.url.replace(
      createQueries.QUERIES.markdownUrl,
      (_, filename, hash = '') => `${filename}.html${hash}`
    );

    return [SKIP];
  };

  /**
   * Updates a reference
   *
   * @param {import('@types/mdast').Text} node The current node
   * @param {import('@types/mdast').Parent} parent The parent node
   * @param {string|RegExp} query The search query
   * @param {Function} transformer The function to transform the reference
   *
   */
  const updateReferences = (query, transformer, node, parent) => {
    const replacedTypes = node.value
      .replace(query, transformer)
      // Remark doesn't handle leading / trailing spaces, so replace them with
      // HTML entities.
      .replace(/^\s/, '&nbsp;')
      .replace(/\s$/, '&nbsp;');

    // This changes the type into a link by splitting it up into several nodes,
    // and adding those nodes to the parent.
    const {
      children: [newNode],
    } = remark.parse(replacedTypes);

    // Find the index of the original node in the parent
    const index = parent.children.indexOf(node);

    // Replace the original node with the new node(s)
    parent.children.splice(index, 1, ...newNode.children);

    return [SKIP];
  };

  /**
   * Updates a Markdown Link Reference into an actual Link to the Definition
   *
   * @param {import('@types/mdast').LinkReference} node A link reference node
   * @param {Array<import('@types/mdast').Definition>} definitions The Definitions of the API Doc
   */
  const updateLinkReference = (node, definitions) => {
    const definition = definitions.find(
      ({ identifier }) => identifier === node.identifier
    );

    node.type = 'link';
    node.url = definition.url;

    return [SKIP];
  };

  /**
   * Parses a Stability Index Entry and updates the current Metadata
   *
   * @param {import('@types/mdast').Blockquote} node Thead Link Reference Node
   * @param {ReturnType<import('../../metadata.mjs').default>} [apiEntryMetadata] The API entry Metadata
   */
  const addStabilityMetadata = (node, apiEntryMetadata) => {
    // `node` is a `blockquote` node, and the first child will always be
    // a `paragraph` node, so we can safely access the children of the first child
    // which we use as the prefix and description of the Stability Index
    const stabilityPrefix = transformNodesToString(node.children[0].children);

    // Attempts to grab the Stability index and description from the prefix
    const matches = createQueries.QUERIES.stabilityIndex.exec(stabilityPrefix);

    // Ensures that the matches are valid and that we have at least 3 entries
    if (matches && matches.length === 3) {
      // Updates the `data` property of the Stability Index node
      // so that the original node data can also be inferred
      node.data = {
        // The 2nd match should be the group that matches the Stability Index
        index: matches[1],
        // The 3rd match should be the group containing all the remaining text
        // which is used as a description (we trim it to an one liner)
        description: matches[2].replace(/\n/g, ' ').trim(),
      };

      // Creates a new Tree node containing the Stability Index metadata
      const stabilityIndexNode = createTree(
        'root',
        { data: node.data },
        node.children
      );

      // Adds the Stability Index metadata to the current Metadata entry
      apiEntryMetadata?.addStability(stabilityIndexNode);
    }

    return [SKIP];
  };

  /**
   * Updates the Stability Index Prefixes to be Markdown Links
   * to the API documentation
   *
   * @param {import('vfile').VFile} vfile The source Markdown file before any modifications
   */
  const updateStabilityPrefixToLink = vfile => {
    // The `vfile` value is a String (check `loaders.mjs`)
    vfile.value = String(vfile.value).replace(
      createQueries.QUERIES.stabilityIndexPrefix,
      match => `[${match}](${DOC_API_STABILITY_SECTION_REF_URL})`
    );
  };

  return {
    addYAMLMetadata,
    setHeadingMetadata,
    updateMarkdownLink,
    /** @param {Array<import('@types/mdast').Node>} args */
    updateTypeReference: (...args) =>
      updateReferences(
        createQueries.QUERIES.normalizeTypes,
        type => transformTypeToReferenceLink(type, typeMap),
        ...args
      ),
    /** @param {Array<import('@types/mdast').Node>} args */
    updateUnixManualReference: (...args) =>
      updateReferences(
        createQueries.QUERIES.unixManualPage,
        transformUnixManualToLink,
        ...args
      ),
    updateLinkReference,
    addStabilityMetadata,
    updateStabilityPrefixToLink,
  };
};

// This defines the actual REGEX Queries
createQueries.QUERIES = {
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

createQueries.UNIST = {
  /**
   * @param {import('@types/mdast').Blockquote} blockquote
   * @returns {boolean}
   */
  isStabilityNode: ({ type, children }) =>
    type === 'blockquote' &&
    createQueries.QUERIES.stabilityIndex.test(transformNodesToString(children)),
  /**
   * @param {import('@types/mdast').Html} html
   * @returns {boolean}
   */
  isYamlNode: ({ type, value }) =>
    type === 'html' && createQueries.QUERIES.yamlInnerContent.test(value),
  /**
   * @param {import('@types/mdast').Text} text
   * @returns {boolean}
   */
  isTextWithType: ({ type, value }) =>
    type === 'text' && createQueries.QUERIES.normalizeTypes.test(value),
  /**
   * @param {import('@types/mdast').Text} text
   * @returns {boolean}
   */
  isTextWithUnixManual: ({ type, value }) =>
    type === 'text' && createQueries.QUERIES.unixManualPage.test(value),
  /**
   * @param {import('@types/mdast').Html} html
   * @returns {boolean}
   */
  isHtmlWithType: ({ type, value }) =>
    type === 'html' && createQueries.QUERIES.linksWithTypes.test(value),
  /**
   * @param {import('@types/mdast').Link} link
   * @returns {boolean}
   */
  isMarkdownUrl: ({ type, url }) =>
    type === 'link' && createQueries.QUERIES.markdownUrl.test(url),
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
  isTypedList: list => {
    // Exit early if not a list node
    if (list.type !== 'list') {
      return false;
    }

    // Get the content nodes of the first list item's paragraph
    const [node, ...contentNodes] =
      list?.children?.[0]?.children?.[0]?.children ?? [];

    // Exit if no node
    if (!node) {
      return false;
    }

    const possibleProperty = node?.value?.trimStart();

    // Check for other starters
    if (possibleProperty?.match(createQueries.QUERIES.typedListStarters)) {
      return true;
    }

    // Check for direct type link pattern (starts with '<')
    if (node.type === 'link' && node.children?.[0]?.value?.[0] === '<') {
      return true;
    }

    // Check for inline code + space + type link pattern
    if (
      node.type === 'inlineCode' &&
      possibleProperty?.match(VALID_JAVASCRIPT_PROPERTY) &&
      contentNodes[0]?.value?.trim() === '' &&
      contentNodes[1]?.type === 'link' &&
      contentNodes[1]?.children?.[0]?.value?.[0] === '<'
    ) {
      return true;
    }

    // Not a typed list
    return false;
  },
};

export default createQueries;
