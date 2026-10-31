'use strict';

// Bump whenever the shape of what is stored changes
export const SCHEMA = 1;

export const MANIFEST_DIRECTORY = '.doc-kit';
export const MANIFEST_FILE = 'manifest.json';

// Hex characters of a sha256 digest kept: 128 bits
export const KEY_LENGTH = 32;

// Global configuration keys holding locations, left out of every salt
export const SALT_CONFIG_OMIT = ['input', 'ignore', 'output', 'pathsToCopy'];
