// The steps naming the reference's pages and giving everything a URL.
import { ReflectionKind } from 'typedoc';

import {
  memberAnchor,
  membersOf,
  referencedDeclaration,
} from '../utils/reflections.mjs';

/**
 * Names the page of each export after its kind and name (`Function.build`).
 * Distinct exports sharing a name get a numeric suffix (`Interface.Options-1`).
 *
 * @param {import('typedoc').DeclarationReflection[]} declarations
 * @param {Map<import('typedoc').Reflection, string>} pages
 */
export const nameDeclarationPages = (declarations, pages) => {
  const taken = new Set();

  for (const declaration of declarations) {
    const name = `${ReflectionKind[declaration.kind]}.${declaration.name}`;
    let page = name;

    for (let index = 1; taken.has(page.toLowerCase()); index++) {
      page = `${name}-${index}`;
    }

    taken.add(page.toLowerCase());
    pages.set(declaration, page);
  }
};

/**
 * Names the page of each member of the `docKitMemberPages` types
 * (`InputOptions.input`), and lists those members by type.
 *
 * @param {Map<string, import('typedoc').DeclarationReflection>} byName
 * @param {string[]} owners The `docKitMemberPages` types
 * @param {Map<import('typedoc').Reflection, string>} pages
 */
export const nameMemberPages = (byName, owners, pages) => {
  /** @type {Map<string, import('typedoc').DeclarationReflection[]>} */
  const memberPages = new Map();

  for (const owner of owners) {
    const declaration = byName.get(owner);
    const members = declaration ? membersOf(declaration) : [];

    memberPages.set(owner, members);

    for (const member of members) {
      pages.set(member, `${owner}.${member.name}`);
    }
  }

  return memberPages;
};

/**
 * The types documented on the page of the one member page using them, by
 * type: the members of such a type have no other home.
 *
 * @param {Map<string, import('typedoc').DeclarationReflection[]>} memberPages
 * @param {Map<import('typedoc').Reflection, string>} pages
 */
export const findInlinedTypes = (memberPages, pages) => {
  /** @type {Map<import('typedoc').DeclarationReflection, import('typedoc').DeclarationReflection[]>} */
  const users = new Map();

  for (const members of memberPages.values()) {
    for (const member of members) {
      const type = referencedDeclaration(member.type);
      const documented = type && membersOf(type).length > 0 && pages.has(type);

      if (!documented) {
        continue;
      }

      const typeUsers = users.get(type) ?? [];
      typeUsers.push(member);
      users.set(type, typeUsers);
    }
  }

  const inlined = new Map();

  for (const [type, members] of users) {
    if (members.length === 1) {
      inlined.set(type, members[0]);
    }
  }

  return inlined;
};

/**
 * The URL of every page, and of every member, which links to its heading on
 * its owner's page. An inlined type's URL is the page documenting it.
 *
 * @param {object} model
 * @param {import('typedoc').DeclarationReflection[]} model.declarations
 * @param {Map<import('typedoc').Reflection, string>} model.pages
 * @param {Map<import('typedoc').DeclarationReflection, import('typedoc').DeclarationReflection>} model.inlined
 * @param {string} basePath
 */
export const assignUrls = ({ declarations, pages, inlined }, basePath) => {
  /** @type {Map<import('typedoc').Reflection, string>} */
  const urls = new Map();

  for (const [reflection, page] of pages) {
    urls.set(reflection, `${basePath}/${page}`);
  }

  for (const declaration of declarations) {
    const home = inlined.get(declaration) ?? declaration;
    const homeUrl = urls.get(home);

    for (const member of membersOf(declaration)) {
      if (!urls.has(member)) {
        urls.set(member, `${homeUrl}#${memberAnchor(member)}`);
      }
    }

    if (inlined.has(declaration)) {
      urls.set(declaration, homeUrl);
    }
  }

  return urls;
};
