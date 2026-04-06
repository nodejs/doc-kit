'use strict';

// Matches deprecation headings (e.g., "DEP0001: some title") and captures
// the deprecation code (e.g., "DEP0001") as the first group
export const DEPRECATION_HEADING_REGEX = /^(DEP\d+):/;
