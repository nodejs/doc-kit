import { collectDeclarations } from './declarations.mjs';
import {
  assignUrls,
  findInlinedTypes,
  nameDeclarationPages,
  nameMemberPages,
} from './pages.mjs';
import { isDeclaration } from '../utils/reflections.mjs';

/**
 * Builds the model of the reference: which exports and members have a page,
 * and the URL of everything comments and types can link to.
 *
 * @param {import('typedoc').ProjectReflection} project
 * @param {import('../types').Options} options
 * @returns {import('../types').Model}
 */
export const createModel = (project, options) => {
  const { declarations, importPaths, categories } = collectDeclarations(
    project,
    options
  );

  const byName = new Map();

  for (const declaration of declarations) {
    byName.set(declaration.name, declaration);
  }

  /** @type {Map<import('typedoc').Reflection, string>} */
  const pages = new Map();

  nameDeclarationPages(declarations, pages);

  const memberPages = nameMemberPages(byName, options.docKitMemberPages, pages);
  const inlined = findInlinedTypes(memberPages, pages);
  const urls = assignUrls(
    { declarations, pages, inlined },
    options.docKitBasePath
  );

  /**
   * The member with a page of its own a member is, or inherits
   * (`WatchOptions.input` inherits `BuildOptions.input`).
   *
   * @param {import('typedoc').DeclarationReflection} member
   * @returns {import('typedoc').DeclarationReflection | undefined}
   */
  const memberPageOf = member => {
    const owner = member.parent?.name ?? '';

    if (memberPages.get(owner)?.includes(member)) {
      return member;
    }

    const inherited = member.inheritedFrom?.reflection;

    return isDeclaration(inherited) ? memberPageOf(inherited) : undefined;
  };

  /**
   * The URL of a reflection, or of the closest parent with one.
   *
   * @param {import('typedoc').Reflection | undefined} reflection
   * @returns {string | undefined}
   */
  const url = reflection => {
    if (!reflection) {
      return undefined;
    }

    return urls.get(reflection) ?? url(reflection.parent);
  };

  return {
    declarations,
    pages,
    memberPages,
    inlined,
    byName,
    importPaths,
    categories,
    url,
    memberPageOf,
  };
};
