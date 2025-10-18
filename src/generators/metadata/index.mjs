'use strict';

import { parseApiDoc } from './utils/parse.mjs';

/**
 * This generator generates a flattened list of metadata entries from a API doc
 *
 * @typedef {Array<ParserOutput<import('mdast').Root>>} Input
 *
 * @type {GeneratorMetadata<Input, Array<ApiDocMetadataEntry>>}
 */
export default {
  name: 'metadata',

  version: '1.0.0',

  description: 'generates a flattened list of API doc metadata entries',

  dependsOn: 'ast',

  /**
   * @param {Input} inputs
   * @param {GeneratorOptions} options
   * @returns {Promise<Array<ApiDocMetadataEntry>>}
   */
  async generate(inputs, { typeMap }) {
    return inputs.flatMap(input => parseApiDoc(input, typeMap));
  },
};
