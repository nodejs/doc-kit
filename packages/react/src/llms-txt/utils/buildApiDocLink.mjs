import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';
import { getEntryDescription } from '@doc-kit/core/utils/generators.mjs';

/**
 * Builds a markdown link for an API doc entry
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} entry
 * @param {import('@doc-kit/core/utils/configuration/types').Configuration['llms-txt']}
 * @returns {string}
 */
export const buildApiDocLink = (entry, config) => {
  const title = entry.heading.data.name;

  const url = populate(config.pageURL, {
    ...config,
    path: entry.path,
  });

  const link = `[${title}](${url})`;

  const description = getEntryDescription(entry);

  return `${link}: ${description}`;
};
