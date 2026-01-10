'use strict';

import { BASE_URL } from '../../../constants.mjs';
import { SCHEMA_FILENAME } from '../constants.mjs';
import jsonAll from '../index.mjs';

/**
 * @param {string} version
 */
export function generateJsonSchema(version) {
  const jsonSchemaUrl = `${BASE_URL}/docs/${version}/api/${SCHEMA_FILENAME}`;

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `nodejs-api-doc-all@v${jsonAll.version}`,
    title: 'Node.js API Documentation Schema (All)',
    readOnly: true,

    properties: {
      modules: {
        type: 'array',
        items: { $ref: `${jsonSchemaUrl}/#/definitions/Module` },
      },
      text: {
        type: 'array',
        items: { $ref: `${jsonSchemaUrl}/#/definitions/Text` },
      },
    },
  };
}
