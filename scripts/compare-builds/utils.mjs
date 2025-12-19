import { fileURLToPath } from 'node:url';

export const BASE = fileURLToPath(import.meta.resolve('../../base'));
export const HEAD = fileURLToPath(import.meta.resolve('../../out'));
