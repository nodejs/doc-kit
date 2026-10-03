import { ParameterType } from 'typedoc';

import { DEFAULT_PAGE_LIST, DEFAULT_TYPE_MAP } from './constants.mjs';
import { generate } from './generate.mjs';

/**
 * The TypeDoc plugin: declares the `docKit*` options and a `doc-kit` output,
 * which writes the reference as doc-kit Markdown.
 *
 * @param {import('typedoc').Application} app
 */
export const load = app => {
  app.options.addDeclaration({
    name: 'docKit',
    help: '[doc-kit] Where to write the reference as doc-kit Markdown.',
    type: ParameterType.Path,
    outputShortcut: 'doc-kit',
  });

  app.options.addDeclaration({
    name: 'docKitBasePath',
    help: "[doc-kit] Where the output directory is under doc-kit's input directory, for the type map and the page list. Defaults to the output directory's name.",
    type: ParameterType.String,
  });

  app.options.addDeclaration({
    name: 'docKitTypeMap',
    help: "[doc-kit] The type map's file name, in the output directory. `null` leaves it out.",
    type: ParameterType.String,
    defaultValue: DEFAULT_TYPE_MAP,
  });

  app.options.addDeclaration({
    name: 'docKitPageList',
    help: "[doc-kit] The page list's file name, in the output directory. `null` leaves it out.",
    type: ParameterType.String,
    defaultValue: DEFAULT_PAGE_LIST,
  });

  app.options.addDeclaration({
    name: 'docKitMemberPages',
    help: '[doc-kit] Interfaces and classes whose members each have a page of their own.',
    type: ParameterType.Array,
  });

  app.options.addDeclaration({
    name: 'docKitReceivers',
    help: '[doc-kit] The name members are documented on, by type name. Defaults to the type name in camelCase.',
    type: ParameterType.Object,
    defaultValue: {},
  });

  app.outputs.addOutput('doc-kit', (directory, project) =>
    generate(app, directory, project)
  );
};
