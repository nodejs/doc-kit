import { fileURLToPath } from 'node:url';

// Comparator Constants
export const BASE =
  process.env.BASE || fileURLToPath(import.meta.resolve('../base'));

export const HEAD =
  process.env.HEAD || fileURLToPath(import.meta.resolve('../out'));

export const TITLE =
  process.env.TITLE || `## \`${process.env.GENERATOR ?? '...'}\` Generator`;

// MDN Constants
export const MDN_COMPAT_URL =
  'https://github.com/mdn/browser-compat-data/releases/latest/download/data.json';

export const MDN_TYPE_MAP = fileURLToPath(
  import.meta.resolve('../src/generators/metadata/maps/mdn.json')
);
