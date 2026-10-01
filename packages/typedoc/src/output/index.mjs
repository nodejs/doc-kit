import { join } from 'node:path';

import { pageList, typeMap } from './manifest.mjs';
import { PAGE_LIST_FILE, TYPE_MAP_FILE } from '../constants.mjs';
import { createModel } from '../model/index.mjs';
import { readOptions } from '../options.mjs';
import { declarationPage, memberPage } from '../render/pages.mjs';
import {
  removeStalePages,
  repositoryRoot,
  writeIfChanged,
} from '../utils/files.mjs';

/**
 * A page's lines as a Markdown file: no runs of blank lines, one final
 * newline.
 *
 * @param {string[]} lines
 */
const toMarkdown = lines =>
  `${lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`;

/**
 * A value as a JSON file.
 *
 * @param {unknown} value
 */
const toJson = value => `${JSON.stringify(value, null, 2)}\n`;

/**
 * The reference's files, by name: a page per export and member page, the
 * type map and the page list.
 *
 * @param {import('../render/comments.mjs').Context} context
 */
const renderFiles = context => {
  const { model } = context;
  const files = new Map();

  for (const declaration of model.declarations) {
    const page = declarationPage(context, declaration);

    files.set(`${model.pages.get(declaration)}.md`, toMarkdown(page));
  }

  for (const members of model.memberPages.values()) {
    for (const member of members) {
      const page = memberPage(context, member);

      files.set(`${model.pages.get(member)}.md`, toMarkdown(page));
    }
  }

  files.set(TYPE_MAP_FILE, toJson(typeMap(model)));
  files.set(PAGE_LIST_FILE, toJson(pageList(model)));

  return files;
};

/**
 * Generates the reference into a directory, writing only the files that
 * changed and removing pages that no longer exist.
 *
 * @param {import('typedoc').Application} app
 * @param {import('typedoc').ProjectReflection} project
 * @param {string} directory
 */
export const writeReference = async (app, project, directory) => {
  const options = readOptions(app, directory);
  const model = createModel(project, options);
  const context = { model, options, root: repositoryRoot() };

  const files = renderFiles(context);

  await removeStalePages(directory, files);

  const writes = [];

  for (const [name, contents] of files) {
    writes.push(writeIfChanged(join(directory, name), contents));
  }

  await Promise.all(writes);

  app.logger.info(`Generated the doc-kit reference in ${directory}`);
};
