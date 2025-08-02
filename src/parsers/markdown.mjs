'use strict';

import { coerce } from 'semver';

import { loadFromURL } from '../utils/parser.mjs';
import createQueries from '../utils/queries/index.mjs';
import { getRemark } from '../utils/remark.mjs';

// A ReGeX for retrieving Node.js version headers from the CHANGELOG.md
const NODE_VERSIONS_REGEX = /\* \[Node\.js ([0-9.]+)\]\S+ (.*)\r?\n/g;

// A ReGeX for retrieving the list items in the index document
const LIST_ITEM_REGEX = /\* \[(.*?)\]\((.*?)\.md\)/g;

// A ReGeX for checking if a Node.js version is an LTS release
const NODE_LTS_VERSION_REGEX = /Long Term Support/i;

/**
 * Creates an API doc parser for a given Markdown API doc file
 */
const createParser = () => {
  // Creates an instance of the Remark processor with GFM support
  const remarkProcessor = getRemark();

  const { updateStabilityPrefixToLink } = createQueries();

  /**
   * Parses a given API doc file into a AST tree
   *
   * @param {import('vfile').VFile | Promise<import('vfile').VFile>} apiDoc
   * @returns {Promise<ParserOutput<import('mdast').Root>>}
   */
  const parseApiDoc = async apiDoc => {
    // We allow the API doc VFile to be a Promise of a VFile also,
    // hence we want to ensure that it first resolves before we pass it to the parser
    const resolvedApiDoc = await Promise.resolve(apiDoc);

    // Normalizes all the Stability Index prefixes with Markdown links
    updateStabilityPrefixToLink(resolvedApiDoc);

    // Parses the API doc into an AST tree using `unified` and `remark`
    const apiDocTree = remarkProcessor.parse(resolvedApiDoc);

    return {
      file: {
        stem: resolvedApiDoc.stem,
        basename: resolvedApiDoc.basename,
      },
      tree: apiDocTree,
    };
  };

  /**
   * This method allows to parse multiple API doc files at once
   * and it simply wraps parseApiDoc with the given API docs
   *
   * @param {Array<import('vfile').VFile | Promise<import('vfile').VFile>>} apiDocs List of API doc files to be parsed
   * @returns {Promise<Array<ParserOutput<import('mdast').Root>>>}
   */
  const parseApiDocs = async apiDocs => {
    // We do a Promise.all, to ensure that each API doc is resolved asynchronously
    // but all need to be resolved first before we return the result to the caller
    return Promise.all(apiDocs.map(parseApiDoc));
  };

  return { parseApiDocs, parseApiDoc };
};

/**
 * Retrieves all Node.js major versions from the provided CHANGELOG.md file
 * and returns an array of objects containing the version and LTS status.
 * @param {string|URL} path Path to changelog
 * @returns {Promise<Array<ApiDocReleaseEntry>>}
 */
export const parseChangelog = async path => {
  const changelog = await loadFromURL(path);

  const nodeMajors = Array.from(changelog.matchAll(NODE_VERSIONS_REGEX));

  return nodeMajors.map(match => ({
    version: coerce(match[1]),
    isLts: NODE_LTS_VERSION_REGEX.test(match[2]),
  }));
};

/**
 * Retrieves all the document titles for sidebar generation.
 *
 * @param {string|URL} path Path to changelog
 * @returns {Promise<Array<{ section: string, api: string }>>}
 */
export const parseIndex = async path => {
  const index = await loadFromURL(path);

  const items = Array.from(index.matchAll(LIST_ITEM_REGEX));

  return items.map(([, section, api]) => ({ section, api }));
};

export default createParser;
