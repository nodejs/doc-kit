'use strict';

import yaml from 'yaml';

import { QUERIES } from '../../../utils/queries/index.mjs';

/**
 * Extracts raw YAML content from a node
 *
 * @param {import('mdast').Node} node A HTML node containing the YAML content
 * @returns {string} The extracted raw YAML content
 */
export const extractYamlContent = node => {
  return node.value.replace(
    QUERIES.yamlInnerContent,
    // Either capture a YAML multinline block, or a simple single-line YAML block
    (_, simple, yaml) => simple || yaml
  );
};

/**
 * Normalizes YAML syntax by fixing some non-cool formatted properties of the
 * docs schema
 *
 * @param {string} yamlContent The raw YAML content to normalize
 * @returns {string} The normalized YAML content
 */
export const normalizeYamlSyntax = yamlContent => {
  return yamlContent
    .replace('introduced_in=', 'introduced_in: ')
    .replace('source_link=', 'source_link: ')
    .replace('type=', 'type: ')
    .replace('name=', 'name: ')
    .replace('llm_description=', 'llm_description: ')
    .replace(/^[\r\n]+|[\r\n]+$/g, ''); // Remove initial and final line breaks
};

/**
 * Parses Markdown YAML source into a JavaScript object containing all the metadata
 * (this is forwarded to the parser so it knows what to do with said metadata)
 *
 * @param {string} yamlString The YAML string to be parsed
 * @returns {import('../types').YAMLProperties} The parsed YAML metadata
 */
export const parseYAMLIntoMetadata = yamlString => {
  const normalizedYaml = normalizeYamlSyntax(yamlString);

  // Ensures that the parsed YAML is an object, because even if it is not
  // i.e. a plain string or an array, it will simply not result into anything
  let parsedYaml = yaml.parse(normalizedYaml);
  // Ensure that only Objects get parsed on Object.keys(), since some `<!--`
  // comments, might be just plain strings and not even a valid YAML metadata
  if (typeof parsedYaml === 'string') {
    return { tags: [parsedYaml] };
  }

  return parsedYaml;
};
