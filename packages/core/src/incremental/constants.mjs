'use strict';

// Bump whenever the shape of what is stored changes
export const SCHEMA = 1;

// Inside the output directory. Holds the manifest and each generator's
// stored results
export const STATE_DIRECTORY = '.doc-kit';
export const MANIFEST_FILE = 'manifest.json';

// Hex characters kept from each sha256 digest (128 bits)
export const KEY_LENGTH = 32;

// Global configuration keys that hold paths, excluded from every salt
export const SALT_CONFIG_OMIT = ['input', 'ignore', 'output', 'pathsToCopy'];
