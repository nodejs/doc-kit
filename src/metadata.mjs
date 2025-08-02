'use strict';

import { u as createTree } from 'unist-builder';

import { sortChanges } from './utils/generators.mjs';

/**
 * This method allows us to handle creation of Metadata entries
 * within the current scope of API docs being parsed
 *
 * This can be used disconnected with a specific file, and can be aggregated
 * to many files to create a full Navigation for a given version of the API
 *
 * @param {InstanceType<typeof import('github-slugger').default>} slugger A GitHub Slugger
 */
const createMetadata = slugger => {
  /**
   * This holds a temporary buffer of raw metadata before being
   * transformed into NavigationEntries and MetadataEntries
   *
   * @type {{
   * heading: ApiDocMetadataEntry['heading'],
   * stability: ApiDocMetadataEntry['stability'],
   * properties: ApiDocRawMetadataEntry,
   * }}
   */
  const internalMetadata = {
    heading: createTree('root', { data: {} }),
    stability: createTree('root', []),
    yaml_position: {},
    properties: { type: undefined, changes: [], tags: [] },
  };

  return {
    /**
     * Set the Heading of a given Metadata
     *
     * @param {HeadingMetadataParent} heading The new heading metadata
     */
    setHeading: heading => {
      // We clone the heading to ensure that we don't accidentally override it
      // with later mutations below on the `.create` method
      internalMetadata.heading = { ...heading };
    },
    /**
     * Set the Stability Index of a given Metadata
     *
     * @param {StabilityIndexParent} stability The stability index node to be added
     */
    addStability: stability => {
      // We clone the stability to ensure that we don't accidentally override it
      // with later mutations below on the `.create` method
      internalMetadata.stability.children.push({ ...stability });
    },
    /**
     * Set the Metadata (from YAML if exists) properties to the current Metadata entry
     * it also allows for extra data (such as Stability Index) and miscellaneous data to be set
     * although it'd be best to only set ones from {ApiDocRawMetadataEntry}
     *
     * Note: A single API doc entry might have multiple YAML metadata blocks,
     * meaning that this method can be called multiple times to update the properties
     * and complement each set of data.
     *
     * Note: This ensures only valid properties get defined and that we don't accidentally override
     * values, when we just want to complement them whenever possible.
     *
     * @param {Partial<ApiDocRawMetadataEntry>} properties Extra Metadata properties to be defined
     */
    updateProperties: properties => {
      Object.entries(properties).forEach(([key, value]) => {
        if (Array.isArray(internalMetadata.properties[key])) {
          return internalMetadata.properties[key].push(...value);
        }

        internalMetadata.properties[key] = value;
      });
    },
    /**
     * Set the YAML position of the current Metadata entry
     *
     * @param {import('unist').Position} yaml_position
     */
    setYamlPosition: yaml_position => {
      internalMetadata.yaml_position = yaml_position;
    },
    /**
     * Generates a new Navigation entry and pushes them to the internal collection
     * of Navigation entries, and returns a MetadataEntry which is then used by the parser
     * and forwarded to any relevant generator.
     *
     * The Navigation entries has a dedicated separate method for retrieval
     * as it can be manipulated outside of the scope of the generation of the content
     *
     * @param {{stem?: string, basename?: string}} apiDoc The API doc file being parsed
     * @param {ApiDocMetadataEntry['content']} section An AST tree containing the Nodes of the API doc entry section
     * @returns {ApiDocMetadataEntry} The locally created Metadata entries
     */
    create: (apiDoc, section) => {
      // This is the ID of a certain Navigation entry, which allows us to anchor
      // a certain navigation section to a page ad the exact point of the page (scroll)
      // This is useful for classes, globals and other type of YAML entries, as they reside
      // within a module (page) and we want to link to them directly
      const sectionSlug = slugger.slug(internalMetadata.heading.data.text);

      const {
        type,
        introduced_in,
        added,
        deprecated,
        removed,
        napiVersion,
        source_link,
        updates = [],
        changes = [],
        tags = [],
        llm_description,
      } = internalMetadata.properties;

      // Also add the slug to the heading data as it is used to build the heading
      internalMetadata.heading.data.slug = sectionSlug;

      // If a `type` property is defined we override the type that comes from the heading
      internalMetadata.heading.data.type =
        type ?? internalMetadata.heading.data.type;

      // Returns the Metadata entry for the API doc
      return {
        api: apiDoc.stem,
        slug: sectionSlug,
        source_link,
        api_doc_source: `doc/api/${apiDoc.basename}`,
        added_in: added,
        deprecated_in: deprecated,
        removed_in: removed,
        n_api_version: napiVersion,
        updates,
        changes: sortChanges(changes),
        heading: internalMetadata.heading,
        stability: internalMetadata.stability,
        content: section,
        tags,
        introduced_in,
        llm_description,
        yaml_position: internalMetadata.yaml_position,
      };
    },
  };
};

export default createMetadata;
