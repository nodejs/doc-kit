import { fileURLToPath } from 'node:url';

export const BASE =
  process.env.BASE || fileURLToPath(import.meta.resolve('../../base'));

export const HEAD =
  process.env.HEAD || fileURLToPath(import.meta.resolve('../../out'));

export const TITLE =
  process.env.TITLE || `## \`${process.env.GENERATOR ?? '...'}\` Generator`;
