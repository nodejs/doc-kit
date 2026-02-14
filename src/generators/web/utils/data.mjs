import { LANGS } from '@node-core/rehype-shiki';

import getConfig from '../../../utils/configuration/index.mjs';
import { lazy } from '../../../utils/misc.mjs';

/**
 * Constructs a set of static, minimal data to send from server to client.
 *
 * Why this exists:
 * - Shiki loads large language grammars and metadata internally.
 * - We want to avoid sending all of this data to the client.
 * - Instead, we extract only a **lightweight map** of language identifiers and display names
 *
 * This data is serializable and efficient to send to the browser.
 */
export const createStaticData = () => {
  const config = getConfig('web');

  // Create a display name map with aliases from Shiki's loaded languages
  const shikiDisplayNameMap = [
    ...new Map(
      // Get all languages, and map aliases to display names
      LANGS.map(({ name, aliases = [], displayName }) => [
        name,
        [[...aliases, name], displayName],
      ])
    ).values(), // Get just the values (alias/displayName pairs)
  ];

  return {
    /** @type {Array<[Array<string>, string]>} */
    shikiDisplayNameMap,
    title: config.title,
    repository: config.repository,
  };
};

export default lazy(() => JSON.stringify(createStaticData()));
