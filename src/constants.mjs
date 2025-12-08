'use strict';

// The current running version of Node.js (Environment)
export const NODE_VERSION = process.version;

// This is the Node.js CHANGELOG to be consumed to generate a list of all major Node.js versions
export const NODE_CHANGELOG_URL =
  'https://raw.githubusercontent.com/nodejs/node/HEAD/CHANGELOG.md';

// The base URL for the Node.js website
export const BASE_URL = 'https://nodejs.org/';

// This is the Node.js Base URL for viewing a file within GitHub UI
export const DOC_NODE_BLOB_BASE_URL =
  'https://github.com/nodejs/node/blob/HEAD/';

// This is the Node.js API docs base URL for editing a file on GitHub UI
export const DOC_API_BLOB_EDIT_BASE_URL =
  'https://github.com/nodejs/node/edit/main/doc/api/';

// Base URL for a specific Node.js version within the Node.js API docs
export const DOC_API_BASE_URL_VERSION = 'https://nodejs.org/docs/latest-v';
