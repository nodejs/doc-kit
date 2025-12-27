import { transformNodeToString } from '../../../utils/unist.mjs';
import { buildApiDocURL } from '../../../utils/url.mjs';

/**
 * Retrieves the description of a given API doc entry. It first checks whether
 * the entry has a llm_description property. If not, it extracts the first
 * paragraph from the entry's content.
 *
 * @param {ApiDocMetadataEntry} entry
 * @returns {string}
 */
export const getEntryDescription = entry => {
  if (entry.llm_description) {
    return entry.llm_description.trim();
  }

  const descriptionNode = entry.content.children.find(
    child => child.type === 'paragraph'
  );

  if (!descriptionNode) {
    return '';
  }

  return (
    transformNodeToString(descriptionNode)
      // Remove newlines and extra spaces
      .replace(/[\r\n]+/g, '')
  );
};

/**
 * Builds a markdown link for an API doc entry
 *
 * @param {ApiDocMetadataEntry} entry
 * @returns {string}
 */
export const buildApiDocLink = entry => {
  const title = entry.heading.data.name;

  const url = buildApiDocURL(entry);

  const link = `[${title}](${url})`;

  const description = getEntryDescription(entry);

  return `${link}: ${description}`;
};
