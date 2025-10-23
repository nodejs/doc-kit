'use strict';

import { DOC_NODE_VERSION } from '../../../constants.mjs';
import jsonAll from '../index.mjs';

const JSON_SCHEMA_URL = `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/node-doc-schema.json`;

export const generateJsonSchema = () => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: `nodejs-api-doc-all@v${jsonAll.version}`,
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
