import { ParameterType } from 'typedoc';

/**
 * The plugin's options, set in the TypeDoc configuration alongside its own.
 *
 * @type {Array<import('typedoc').DeclarationOption & { name: keyof import('./types').Options }>}
 */
const DECLARATIONS = [
  {
    name: 'docKitBasePath',
    help: '[doc-kit] The URL path the pages are served under. Defaults to the name of the output directory.',
    type: ParameterType.String,
  },
  {
    name: 'docKitSiteUrl',
    help: '[doc-kit] The URL of the site, whose absolute links in comments become relative.',
    type: ParameterType.String,
  },
  {
    name: 'docKitMemberPages',
    help: '[doc-kit] Types whose members are each documented on a page of their own (e.g. options).',
    type: ParameterType.Array,
  },
  {
    name: 'docKitReceivers',
    help: '[doc-kit] The name members of a type are documented on, by type name (`this` for a plugin context). Defaults to the type name in camelCase.',
    type: ParameterType.Object,
    defaultValue: {},
  },
  {
    name: 'docKitEvents',
    help: '[doc-kit] Event emitters, mapped to the type mapping their event names to the arguments of their listeners.',
    type: ParameterType.Object,
    defaultValue: {},
  },
  {
    name: 'docKitSignatureSources',
    help: '[doc-kit] Types whose members take their signatures from the members of the same name of another type, by type name.',
    type: ParameterType.Object,
    defaultValue: {},
  },
  {
    name: 'docKitImportPaths',
    help: '[doc-kit] The import path of each entry point, by file. Pages of exports missing from the shortest one say where they are exported from.',
    type: ParameterType.Object,
    defaultValue: {},
  },
  {
    name: 'docKitMemberAnchors',
    help: "[doc-kit] Give members an anchor of their name alone (`#input`) besides doc-kit's anchor of their heading.",
    type: ParameterType.Boolean,
  },
];

/**
 * Declares the plugin's options.
 *
 * @param {import('typedoc').Application} app
 */
export const declareOptions = app => {
  for (const declaration of DECLARATIONS) {
    app.options.addDeclaration(declaration);
  }
};

/**
 * Reads the plugin's options.
 *
 * @param {import('typedoc').Application} app
 * @param {string} directory The output directory
 * @returns {import('./types').Options}
 */
export const readOptions = (app, directory) => {
  /**
   * @param {keyof import('./types').Options} name
   */
  const option = name => app.options.getValue(name);
  const basePath =
    option('docKitBasePath') || `/${directory.split(/[\\/]/).at(-1)}`;

  return {
    docKitBasePath: basePath.replace(/\/$/, ''),
    docKitSiteUrl: option('docKitSiteUrl').replace(/\/$/, ''),
    docKitMemberPages: option('docKitMemberPages'),
    docKitReceivers: option('docKitReceivers'),
    docKitEvents: option('docKitEvents'),
    docKitSignatureSources: option('docKitSignatureSources'),
    docKitImportPaths: option('docKitImportPaths'),
    docKitMemberAnchors: option('docKitMemberAnchors'),
  };
};
