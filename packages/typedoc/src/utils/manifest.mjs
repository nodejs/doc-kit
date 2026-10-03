import { withExt } from '@doc-kit/core/utils/file.mjs';
import { ReflectionKind } from 'typedoc';

import { categoryOf } from './reflections.mjs';

/**
 * Where a page is under doc-kit's input directory: `api/classes/Watcher`.
 *
 * @param {string} basePath
 * @param {string} url The page's URL in the output directory
 */
const inputPath = (basePath, url) =>
  [basePath, withExt(url, '')].filter(Boolean).join('/');

/**
 * Type names mapped to the pages documenting them, for doc-kit's `typeMap`
 * to link `{Type}` annotations with.
 *
 * @param {Array<import('typedoc').PageDefinition>} pages
 * @param {string} basePath
 */
export const typeMap = (pages, basePath) =>
  Object.fromEntries(
    pages
      .filter(({ model }) => model.kindOf(ReflectionKind.TypeReferenceTarget))
      .map(({ model, url }) => [model.name, inputPath(basePath, url)])
  );

/**
 * Every page, for the site to build its navigation from.
 *
 * @param {Array<import('typedoc').PageDefinition>} pages
 * @param {string} basePath
 * @returns {import('../types').PageEntry[]}
 */
export const pageList = (pages, basePath) =>
  pages.map(({ model, url }) => ({
    name: model.getFriendlyFullName(),
    kind: ReflectionKind[model.kind],
    url: `/${inputPath(basePath, url)}`,
    category: categoryOf(model),
  }));
