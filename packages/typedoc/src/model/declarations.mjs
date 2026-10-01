import { resolve } from 'node:path';

import { ReflectionKind } from 'typedoc';

import { PAGE_KINDS } from '../constants.mjs';
import { deref, isDeclaration } from '../utils/reflections.mjs';

/**
 * Whether a reflection is a module (an entry point).
 *
 * @param {import('typedoc').Reflection} reflection
 */
const isModule = reflection => reflection.kindOf(ReflectionKind.Module);

/**
 * Orders declarations by name.
 *
 * @param {import('typedoc').DeclarationReflection} a
 * @param {import('typedoc').DeclarationReflection} b
 */
const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * The modules of a project: its entry points, or the project itself when it
 * has a single one.
 *
 * @param {import('typedoc').ProjectReflection} project
 */
const modulesOf = project => {
  const children = project.children ?? [];

  return children.every(isModule) ? children : [project];
};

/**
 * `docKitImportPaths`, by absolute file path.
 *
 * @param {import('../types').Options} options
 */
const importPathsByFile = options => {
  const paths = new Map();

  for (const [file, path] of Object.entries(options.docKitImportPaths)) {
    paths.set(resolve(file), path);
  }

  return paths;
};

/**
 * The exports with a page of their own, sorted by name, with the import paths
 * they are exported from and their `@category`.
 *
 * @param {import('typedoc').ProjectReflection} project
 * @param {import('../types').Options} options
 */
export const collectDeclarations = (project, options) => {
  /** @type {Map<import('typedoc').DeclarationReflection, Set<string>>} */
  const importPaths = new Map();
  /** @type {Map<import('typedoc').Reflection, string>} */
  const categories = new Map();

  const pathsByFile = importPathsByFile(options);

  for (const module of modulesOf(project)) {
    const path = pathsByFile.get(module.sources?.[0]?.fullFileName ?? '');

    for (const child of module.children ?? []) {
      const declaration = deref(child);

      if (!isDeclaration(declaration) || !declaration.kindOf(PAGE_KINDS)) {
        continue;
      }

      const paths = importPaths.get(declaration) ?? new Set();
      importPaths.set(declaration, paths);

      if (path) {
        paths.add(path);
      }
    }

    for (const category of module.categories ?? []) {
      for (const child of category.children) {
        categories.set(deref(child), category.title);
      }
    }
  }

  const declarations = [...importPaths.keys()].sort(byName);

  return { declarations, importPaths, categories };
};
