import { LANGS } from '@node-core/rehype-shiki';

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
  };
};

// Export the JSON-encoded version as the module default.
// This makes it easier to inject into other parts of the build (e.g. via `define` in a bundler),
// allowing it to be inlined at compile time as a literal object.
export default JSON.stringify(createStaticData());
