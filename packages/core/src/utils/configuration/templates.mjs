// This is the CHANGELOG to be consumed to generate a list of all major versions
export const CHANGELOG_URL =
  'https://raw.githubusercontent.com/{repository}/{ref}/CHANGELOG.md';

// This is the Base URL for viewing a file within GitHub UI
export const GITHUB_BLOB_URL = 'https://github.com/{repository}/blob/{ref}/';

// This is the API docs base URL for editing a file on GitHub UI.
// GitHub can only edit files on a branch, so this can't use `{ref}`
// (`HEAD` or a tag would 404).
export const GITHUB_EDIT_URL = 'https://github.com/{repository}/edit/main';

/**
 * Populate a template string based on a configuration
 * @param {string} template The template string
 * @param {import("./types").GlobalConfiguration} config The configuration
 * @returns {string} the populated string
 */
export const populate = (template, config) =>
  template.replace(
    /\{(\w+)(?:\|(\w+))?\}/g,
    (match, path, fallback) => config[path] ?? fallback ?? match
  );
