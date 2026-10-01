import { ReflectionKind } from 'typedoc';

import { MEMBER_PAGE_KIND, VALUE_KINDS } from '../constants.mjs';

/**
 * Type names mapped to the pages documenting them, for doc-kit's `typeMap`
 * to link `{Type}` annotations with. URLs are relative to the site's root.
 *
 * @param {import('../types').Model} model
 */
export const typeMap = model => {
  const types = {};

  for (const declaration of model.declarations) {
    if (!declaration.kindOf(VALUE_KINDS)) {
      types[declaration.name] = model.url(declaration).slice(1);
    }
  }

  return types;
};

/**
 * Every page, for the site to build its navigation from: the exports, then
 * the member pages.
 *
 * @param {import('../types').Model} model
 * @returns {import('../types').PageEntry[]}
 */
export const pageList = model => {
  const entries = [];

  for (const declaration of model.declarations) {
    const entry = {
      name: declaration.name,
      kind: ReflectionKind[declaration.kind],
      url: model.url(declaration),
      category: model.categories.get(declaration),
    };

    if (model.inlined.has(declaration)) {
      entry.inlined = true;
    }

    entries.push(entry);
  }

  for (const [owner, members] of model.memberPages) {
    for (const member of members) {
      entries.push({
        name: member.name,
        kind: MEMBER_PAGE_KIND,
        url: model.url(member),
        owner,
      });
    }
  }

  return entries;
};
