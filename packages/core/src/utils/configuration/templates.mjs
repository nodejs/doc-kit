// This is the CHANGELOG to be consumed to generate a list of all major versions
export const CHANGELOG_URL =
  'https://raw.githubusercontent.com/{repository}/{ref}/CHANGELOG.md';

// This is the Base URL for viewing a file within GitHub UI
export const GITHUB_BLOB_URL = 'https://github.com/{repository}/blob/{ref}/';

// This is the API docs base URL for editing a file on GitHub UI
export const GITHUB_EDIT_URL = 'https://github.com/{repository}/edit/{ref}';

// The branch "edit this page" links use when `ref` can't be edited
export const DEFAULT_EDIT_BRANCH = 'main';

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

// Refs GitHub's web editor can't open, as it only edits files on a branch:
const NON_BRANCH_REFS = [
  // `HEAD`, and revisions relative to it (`HEAD~1`, `HEAD^`)
  /^HEAD([~^]\d*)*$/,
  // Commit SHAs (SHA-1 or SHA-256, abbreviated or not)
  /^[0-9a-f]{7,64}$/i,
  // Tags, given in full or as a release version (`v24.0.0`, `1.2.3-rc.1`)
  /^refs\/tags\//,
  /^v?\d+\.\d+\.\d+([-+].*)?$/,
];

/**
 * Returns a ref GitHub's web editor can open. A branch is kept (without its
 * `refs/heads/` prefix), and anything else, which would 404, falls back to
 * {@link DEFAULT_EDIT_BRANCH}.
 *
 * @param {string} [ref] The configured git ref
 * @returns {string}
 */
export const getEditableRef = ref => {
  if (!ref || NON_BRANCH_REFS.some(pattern => pattern.test(ref))) {
    return DEFAULT_EDIT_BRANCH;
  }

  return ref.replace(/^refs\/heads\//, '');
};

/**
 * Populate an "edit this page" URL template, using a ref GitHub can edit
 * @param {string} template The template string
 * @param {import("./types").GlobalConfiguration} config The configuration
 * @returns {string} the populated string
 */
export const populateEditURL = (template, config) =>
  populate(template, { ...config, ref: getEditableRef(config.ref) });
