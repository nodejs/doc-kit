// @ts-check
'use strict';

import { DOC_NODE_VERSION } from '../../../constants.mjs';

const JSON_SCHEMA_URL = `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/node-doc-schema.json`;

export const generateJsonSchema = () => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  // This should be kept in sync with the generator version for this generator
  // AND the `json` generator and schema
  $id: 'nodejs-api-doc-all@v2.0.0', // This should be kept in sync with the generator version.
  title: 'Node.js API Documentation Schema (All)',
  readOnly: true,

  properties: {
    modules: {
      type: 'array',
      items: { $ref: `${JSON_SCHEMA_URL}/#/definitions/Module` },
    },
    text: {
      type: 'array',
      items: { $ref: `${JSON_SCHEMA_URL}/#/definitions/Text` },
    },
  },
});
