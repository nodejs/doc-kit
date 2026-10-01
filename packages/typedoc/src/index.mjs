import { declareOptions } from './options.mjs';
import { writeReference } from './output/index.mjs';

/**
 * The TypeDoc plugin: declares the `docKit*` options and a `doc-kit` output,
 * which writes the reference as doc-kit Markdown.
 *
 * @param {import('typedoc').Application} app
 */
export const load = app => {
  declareOptions(app);

  app.outputs.addOutput('doc-kit', (directory, project) =>
    writeReference(app, project, directory)
  );
};
