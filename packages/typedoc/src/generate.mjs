import { basename, join } from 'node:path';

import { writeFile, writeJSON } from '@doc-kit/core/utils/file.mjs';
import { PageKind } from 'typedoc';

import { EDGE_SLASHES } from './constants.mjs';
import { renderPage } from './render/pages.mjs';
import { pageList, typeMap } from './utils/manifest.mjs';
import { toMarkdown } from './utils/markdown.mjs';
import { secondaryExports } from './utils/reflections.mjs';
import { DocKitRouter } from './utils/router.mjs';

/**
 * Warns of `docKitMemberPages` types none of whose members got a page: a
 * misspelled name, or a type that is no interface or class.
 *
 * @param {import('typedoc').Application} app
 * @param {DocKitRouter} router
 * @param {Array<import('typedoc').PageDefinition>} pages
 */
const checkMemberPages = (app, router, pages) => {
  const owners = new Set(
    pages
      .filter(({ model }) => router.isMemberPage(model))
      .map(({ model }) => model.parent.name)
  );

  for (const name of app.options.getValue('docKitMemberPages')) {
    if (!owners.has(name)) {
      app.logger.warn(
        `[doc-kit] docKitMemberPages: ${name} is no exported interface or class with members`
      );
    }
  }
};

/**
 * Writes the reference into a directory: a page per module, namespace,
 * export and member page, the type map and the page list.
 *
 * @param {import('typedoc').Application} app
 * @param {string} directory
 * @param {import('typedoc').ProjectReflection} project
 */
export const generate = async (app, directory, project) => {
  const router = new DocKitRouter(app);

  // The project's own page is the site's to write (an `index.md`)
  const pages = router
    .buildPages(project)
    .filter(
      ({ kind, model }) => kind === PageKind.Reflection && !model.isProject()
    );

  checkMemberPages(app, router, pages);

  const exportedFrom = secondaryExports(project);

  const writes = pages.map(({ model, url }) => {
    const context = { app, router, exportedFrom, page: model };

    return writeFile(
      join(directory, url),
      toMarkdown(renderPage(context, model))
    );
  });

  const basePath = (
    app.options.getValue('docKitBasePath') || basename(directory)
  ).replace(EDGE_SLASHES, '');

  const typeMapFile = app.options.getValue('docKitTypeMap');
  const pageListFile = app.options.getValue('docKitPageList');

  if (typeMapFile) {
    writes.push(
      writeJSON(join(directory, typeMapFile), typeMap(pages, basePath))
    );
  }

  if (pageListFile) {
    writes.push(
      writeJSON(join(directory, pageListFile), pageList(pages, basePath))
    );
  }

  await Promise.all(writes);
};
