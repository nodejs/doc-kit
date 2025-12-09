'use strict';

import { coerce } from 'semver';

import { loadFromURL } from '../utils/parser.mjs';

// A ReGeX for retrieving Node.js version headers from the CHANGELOG.md
const NODE_VERSIONS_REGEX = /\* \[Node\.js ([0-9.]+)\]\S+ (.*)\r?\n/g;

// A ReGeX for retrieving the list items in the index document
const LIST_ITEM_REGEX = /\* \[(.*?)\]\((.*?)\.md\)/g;

// A ReGeX for checking if a Node.js version is an LTS release
const NODE_LTS_VERSION_REGEX = /Long Term Support/i;

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
